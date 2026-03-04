import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { apiKeyUsage } from '@shared/schema';
import { eq, and, gte } from 'drizzle-orm';

export const API_KEY_RATE_LIMITS: Record<string, number> = {
  'deals:read': 100,
  'deals:write': 100,
  'deals:delete': 50,
  'documents:read': 100,
  'documents:write': 100,
  'documents:sign': 50,
  'borrowers:read': 100,
  'borrowers:write': 50,
  'borrowers:pii': 30,
  'financials:read': 100,
  'financials:write': 50,
  'reports:read': 100,
  'reports:export': 10,
  'reports:data_dump': 5,
  'webhooks:read': 100,
  'webhooks:write': 50,
  'webhooks:manage': 50,
  'admin:users': 30,
  'admin:roles': 30,
  'admin:audit': 30,
  'admin:keys': 30,
  'admin:system': 10,
  '*': 100,
};

export interface RateLimitCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

export async function checkAPIKeyRateLimit(
  apiKeyId: number,
  requiredScopes: string[]
): Promise<RateLimitCheckResult> {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  let limit = API_KEY_RATE_LIMITS['*'] || 100;

  for (const scope of requiredScopes) {
    const scopeLimit = API_KEY_RATE_LIMITS[scope];
    if (scopeLimit && scopeLimit < limit) {
      limit = scopeLimit;
    }
  }

  const recentRequests = await db
    .select()
    .from(apiKeyUsage)
    .where(and(eq(apiKeyUsage.apiKeyId, apiKeyId), gte(apiKeyUsage.timestamp, oneMinuteAgo)));

  const requestCount = recentRequests.length;
  const resetAt = new Date(now.getTime() + 60 * 1000);

  if (requestCount < limit) {
    return {
      allowed: true,
      limit,
      remaining: limit - requestCount,
      resetAt,
    };
  }

  if (recentRequests.length > 0) {
    const oldestRequest = recentRequests.reduce((oldest, current) =>
      current.timestamp < oldest.timestamp ? current : oldest
    );

    const resetTime = new Date(oldestRequest.timestamp.getTime() + 60 * 1000);
    const retryAfter = Math.ceil((resetTime.getTime() - now.getTime()) / 1000);

    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: resetTime,
      retryAfter: Math.max(1, retryAfter),
    };
  }

  return {
    allowed: false,
    limit,
    remaining: 0,
    resetAt,
    retryAfter: 60,
  };
}

export async function enforceAPIKeyRateLimit(req: Request, res: Response, next: NextFunction) {
  if (!req.apiKey) {
    return next();
  }

  try {
    const result = await checkAPIKeyRateLimit(req.apiKey.apiKeyId, req.apiKey.scopes);

    res.set('X-RateLimit-Limit', String(result.limit));
    res.set('X-RateLimit-Remaining', String(result.remaining));
    res.set('X-RateLimit-Reset', String(Math.floor(result.resetAt.getTime() / 1000)));

    if (!result.allowed) {
      res.set('Retry-After', String(result.retryAfter));

      return res.status(429).json({
        error: 'rate_limit_exceeded',
        message: `API rate limit exceeded. Limit: ${result.limit} requests/minute.`,
        limit: result.limit,
        remaining: 0,
        resetAt: result.resetAt,
        retryAfter: result.retryAfter,
      });
    }

    next();
  } catch (error) {
    console.error('Rate limit check error:', error);
    next();
  }
}
