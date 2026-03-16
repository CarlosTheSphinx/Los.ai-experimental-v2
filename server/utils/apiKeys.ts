import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { apiKeys, apiKeyUsage } from '@shared/schema';
import { eq, and, lt, gte, sql } from 'drizzle-orm';

export interface APIKey {
  id: number;
  createdByUserId: number;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt?: Date | null;
  isRevoked: boolean;
  lastUsedAt?: Date | null;
  usageCount: number;
  createdAt: Date;
}

export interface APIKeyUsageRecord {
  apiKeyId: number;
  endpoint: string;
  method: string;
  statusCode: number;
  ipAddress?: string;
  userAgent?: string;
  scopeRequired: string[];
  scopeGranted: string[];
  authorized: boolean;
  errorMessage?: string;
  requestId?: string;
  responseTimeMs?: number;
}

export function generateAPIKey(): { plaintext: string; hash: string; prefix: string } {
  const randomPart = crypto.randomBytes(24).toString('hex');
  const plaintext = `sk_prod_${randomPart}`;
  const hash = bcrypt.hashSync(plaintext, 12);
  const prefix = plaintext.slice(0, 8);

  return { plaintext, hash, prefix };
}

export function validateAPIKey(plaintext: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plaintext, hash);
  } catch {
    return false;
  }
}

export function maskAPIKey(plaintext: string): string {
  if (plaintext.length < 8) return '...';
  return `${plaintext.slice(0, 8)}...${plaintext.slice(-4)}`;
}

export function extractAPIKeyFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }

  if (parts.length === 1 && parts[0].startsWith('sk_prod_')) {
    return parts[0];
  }

  return null;
}

export async function lookupAPIKey(plaintext: string): Promise<APIKey | null> {
  const allKeys = await db.select().from(apiKeys);

  for (const key of allKeys) {
    if (validateAPIKey(plaintext, key.keyHash)) {
      return {
        id: key.id,
        createdByUserId: key.createdByUserId,
        name: key.name,
        keyHash: key.keyHash,
        keyPrefix: key.keyPrefix,
        scopes: (key.scopes as string[]) || [],
        expiresAt: key.expiresAt,
        isRevoked: key.isRevoked ?? false,
        lastUsedAt: key.lastUsedAt,
        usageCount: key.usageCount ?? 0,
        createdAt: key.createdAt,
      };
    }
  }

  return null;
}

export function isAPIKeyValid(key: APIKey): boolean {
  if (key.isRevoked) {
    return false;
  }

  if (key.expiresAt && new Date() > new Date(key.expiresAt)) {
    return false;
  }

  return true;
}

export function validateScopes(
  requiredScopes: string[],
  grantedScopes: string[]
): { valid: boolean; missingScopes: string[] } {
  if (grantedScopes.includes('*')) {
    return { valid: true, missingScopes: [] };
  }

  const missing: string[] = [];

  for (const required of requiredScopes) {
    const hasScopeExact = grantedScopes.includes(required);
    const hasScopeWildcard = grantedScopes.some((granted) => {
      if (granted.endsWith(':*')) {
        const prefix = granted.slice(0, -2);
        return required.startsWith(prefix + ':');
      }
      return false;
    });

    if (!hasScopeExact && !hasScopeWildcard) {
      missing.push(required);
    }
  }

  return {
    valid: missing.length === 0,
    missingScopes: missing,
  };
}

export function scopeMatches(requiredScope: string, grantedScopes: string[]): boolean {
  const result = validateScopes([requiredScope], grantedScopes);
  return result.valid;
}

export async function checkRateLimit(
  apiKeyId: number,
  limit: number = 100
): Promise<{ allowed: boolean; remaining?: number; retryAfter?: number }> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

  const recentRequests = await db
    .select()
    .from(apiKeyUsage)
    .where(and(eq(apiKeyUsage.apiKeyId, apiKeyId), gte(apiKeyUsage.timestamp, oneMinuteAgo)));

  const requestCount = recentRequests.length;

  if (requestCount < limit) {
    return {
      allowed: true,
      remaining: limit - requestCount,
    };
  }

  const oldestRequest = recentRequests.reduce((oldest, current) =>
    current.timestamp < oldest.timestamp ? current : oldest
  );

  const retryAfter = Math.ceil((oldestRequest.timestamp.getTime() + 60 * 1000 - Date.now()) / 1000);

  return {
    allowed: false,
    retryAfter: Math.max(1, retryAfter),
  };
}

export async function updateKeyLastUsed(apiKeyId: number): Promise<void> {
  await db
    .update(apiKeys)
    .set({
      lastUsedAt: new Date(),
      usageCount: sql`${apiKeys.usageCount} + 1`,
    })
    .where(eq(apiKeys.id, apiKeyId));
}

export async function logAPIKeyUsage(usage: APIKeyUsageRecord): Promise<void> {
  try {
    await db
      .insert(apiKeyUsage)
      .values({
        apiKeyId: usage.apiKeyId,
        endpoint: usage.endpoint,
        method: usage.method,
        statusCode: usage.statusCode,
        ipAddress: usage.ipAddress,
        userAgent: usage.userAgent,
        scopeRequired: usage.scopeRequired,
        scopeGranted: usage.scopeGranted,
        authorized: usage.authorized,
        errorMessage: usage.errorMessage,
        requestId: usage.requestId,
        responseTimeMs: usage.responseTimeMs,
      });
  } catch (err) {
    console.error('Failed to log API key usage:', err);
  }
}

export async function revokeAPIKey(apiKeyId: number): Promise<void> {
  await db
    .update(apiKeys)
    .set({ isRevoked: true })
    .where(eq(apiKeys.id, apiKeyId));
}

export async function rotateAPIKey(apiKeyId: number): Promise<{ plaintext: string; newKeyId: number }> {
  const originalKey = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.id, apiKeyId))
    .limit(1);

  if (originalKey.length === 0) {
    throw new Error('API key not found');
  }

  const original = originalKey[0];
  const { plaintext, hash, prefix } = generateAPIKey();

  const [newKey] = await db
    .insert(apiKeys)
    .values({
      createdByUserId: original.createdByUserId,
      name: `${original.name} (rotated)`,
      keyHash: hash,
      keyPrefix: prefix,
      scopes: original.scopes,
      expiresAt: original.expiresAt,
    })
    .returning();

  await revokeAPIKey(apiKeyId);

  return { plaintext, newKeyId: newKey.id };
}

export async function listAPIKeysByUser(
  userId: number,
  options?: { includeRevoked?: boolean }
): Promise<APIKey[]> {
  const allKeys = await db.select().from(apiKeys).where(eq(apiKeys.createdByUserId, userId));

  const filtered = options?.includeRevoked ? allKeys : allKeys.filter(k => !k.isRevoked);

  return filtered.map((key) => ({
    id: key.id,
    createdByUserId: key.createdByUserId,
    name: key.name,
    keyHash: key.keyHash,
    keyPrefix: key.keyPrefix,
    scopes: (key.scopes as string[]) || [],
    expiresAt: key.expiresAt,
    isRevoked: key.isRevoked ?? false,
    lastUsedAt: key.lastUsedAt,
    usageCount: key.usageCount ?? 0,
    createdAt: key.createdAt,
  }));
}

export async function getAPIKeyUsageStats(
  apiKeyId: number,
  timeframeMinutes: number = 1440
): Promise<{
  totalRequests: number;
  authorizedRequests: number;
  deniedRequests: number;
  averageResponseTimeMs: number;
  statusCodeDistribution: Record<number, number>;
}> {
  const startTime = new Date(Date.now() - timeframeMinutes * 60 * 1000);

  const usageRecords = await db
    .select()
    .from(apiKeyUsage)
    .where(and(eq(apiKeyUsage.apiKeyId, apiKeyId), gte(apiKeyUsage.timestamp, startTime)));

  const statusCodeMap: Record<number, number> = {};
  let totalResponseTime = 0;
  let authorizedCount = 0;
  let deniedCount = 0;

  for (const record of usageRecords) {
    if (record.statusCode) {
      statusCodeMap[record.statusCode] = (statusCodeMap[record.statusCode] || 0) + 1;
    }
    if (record.responseTimeMs) {
      totalResponseTime += record.responseTimeMs;
    }
    if (record.authorized) {
      authorizedCount++;
    } else {
      deniedCount++;
    }
  }

  return {
    totalRequests: usageRecords.length,
    authorizedRequests: authorizedCount,
    deniedRequests: deniedCount,
    averageResponseTimeMs: usageRecords.length > 0 ? totalResponseTime / usageRecords.length : 0,
    statusCodeDistribution: statusCodeMap,
  };
}

export async function deleteAPIKey(apiKeyId: number): Promise<void> {
  await db.delete(apiKeys).where(eq(apiKeys.id, apiKeyId));
}
