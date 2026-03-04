import type { Express, Request, Response } from 'express';
import {
  generateAPIKey,
  maskAPIKey,
  listAPIKeysByUser,
  revokeAPIKey,
  rotateAPIKey,
  deleteAPIKey,
  getAPIKeyUsageStats,
} from '../utils/apiKeys';
import { areValidScopes } from '../utils/apiScopes';
import { createAuditLog } from '../utils/audit';
import { apiKeys } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface ApiKeysDeps {
  db: any;
  authenticateUser: any;
}

export function setupApiKeysRoutes(app: Express, deps: ApiKeysDeps) {
  const { db, authenticateUser } = deps;

  app.post('/api/admin/api-keys', authenticateUser, async (req: Request, res: Response) => {
    try {
      if ((req as any).user?.role !== 'super_admin') {
        return res.status(403).json({
          error: 'forbidden',
          message: 'Only super_admin can create API keys for other users.',
        });
      }

      const { userId, name, scopes, expiresAt } = req.body;

      if (!userId || !name || !scopes || !Array.isArray(scopes)) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'userId, name, and scopes (array) are required.',
        });
      }

      const { valid, invalidScopes } = areValidScopes(scopes);
      if (!valid) {
        return res.status(400).json({
          error: 'invalid_scopes',
          message: `The following scopes are invalid: ${invalidScopes.join(', ')}`,
        });
      }

      const { plaintext, hash, prefix } = generateAPIKey();

      const [newKey] = await db
        .insert(apiKeys)
        .values({
          createdByUserId: parseInt(userId),
          name,
          keyHash: hash,
          keyPrefix: prefix,
          scopes,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        })
        .returning();

      await createAuditLog(db, {
        userId: (req as any).user.id,
        action: 'apikey.created',
        resourceType: 'api_key',
        resourceId: String(newKey.id),
        newValues: { name, scopes, createdFor: userId },
        success: true,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      });

      res.json({
        id: newKey.id,
        userId,
        name,
        keyPlaintext: plaintext,
        keyPreview: maskAPIKey(plaintext),
        scopes,
        expiresAt: expiresAt || null,
        createdAt: newKey.createdAt,
        message: 'Save the key plaintext now. You will not see it again.',
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      res.status(500).json({ error: 'internal_error', message: 'Failed to create API key.' });
    }
  });

  app.get('/api/admin/api-keys', authenticateUser, async (req: Request, res: Response) => {
    try {
      if ((req as any).user?.role !== 'super_admin') {
        return res.status(403).json({
          error: 'forbidden',
          message: 'Only super_admin can list all API keys.',
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      const allKeys = await db.select().from(apiKeys).limit(limit).offset(offset);
      const total = (await db.select().from(apiKeys)).length;

      res.json({
        keys: allKeys.map((key: any) => ({
          id: key.id,
          createdByUserId: key.createdByUserId,
          name: key.name,
          keyPrefix: key.keyPrefix,
          scopes: key.scopes,
          expiresAt: key.expiresAt,
          isRevoked: key.isRevoked,
          lastUsedAt: key.lastUsedAt,
          usageCount: key.usageCount,
          createdAt: key.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error listing API keys:', error);
      res.status(500).json({ error: 'internal_error', message: 'Failed to list API keys.' });
    }
  });

  app.get('/api/admin/api-keys/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
      if ((req as any).user?.role !== 'super_admin') {
        return res.status(403).json({ error: 'forbidden', message: 'Only super_admin can view API key details.' });
      }

      const keyId = parseInt(req.params.id);
      const key = await db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).limit(1);

      if (key.length === 0) {
        return res.status(404).json({ error: 'not_found', message: 'API key not found.' });
      }

      const k = key[0];
      res.json({
        id: k.id,
        createdByUserId: k.createdByUserId,
        name: k.name,
        keyPrefix: k.keyPrefix,
        scopes: k.scopes,
        expiresAt: k.expiresAt,
        isRevoked: k.isRevoked,
        lastUsedAt: k.lastUsedAt,
        usageCount: k.usageCount,
        createdAt: k.createdAt,
      });
    } catch (error) {
      console.error('Error getting API key:', error);
      res.status(500).json({ error: 'internal_error', message: 'Failed to get API key.' });
    }
  });

  app.patch('/api/admin/api-keys/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
      if ((req as any).user?.role !== 'super_admin') {
        return res.status(403).json({ error: 'forbidden', message: 'Only super_admin can update API keys.' });
      }

      const { name, scopes, expiresAt } = req.body;
      const keyId = parseInt(req.params.id);

      const existingKey = await db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).limit(1);
      if (existingKey.length === 0) {
        return res.status(404).json({ error: 'not_found', message: 'API key not found.' });
      }

      if (scopes && Array.isArray(scopes)) {
        const { valid, invalidScopes } = areValidScopes(scopes);
        if (!valid) {
          return res.status(400).json({
            error: 'invalid_scopes',
            message: `Invalid scopes: ${invalidScopes.join(', ')}`,
          });
        }
      }

      const updates: any = {};
      if (name) updates.name = name;
      if (scopes) updates.scopes = scopes;
      if (expiresAt) updates.expiresAt = new Date(expiresAt);

      await db.update(apiKeys).set(updates).where(eq(apiKeys.id, keyId));

      await createAuditLog(db, {
        userId: (req as any).user.id,
        action: 'apikey.scope_updated',
        resourceType: 'api_key',
        resourceId: String(keyId),
        newValues: updates,
        success: true,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      });

      const updated = await db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).limit(1);
      const k = updated[0];

      res.json({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        scopes: k.scopes,
        expiresAt: k.expiresAt,
      });
    } catch (error) {
      console.error('Error updating API key:', error);
      res.status(500).json({ error: 'internal_error', message: 'Failed to update API key.' });
    }
  });

  app.post('/api/admin/api-keys/:id/rotate', authenticateUser, async (req: Request, res: Response) => {
    try {
      if ((req as any).user?.role !== 'super_admin') {
        return res.status(403).json({ error: 'forbidden', message: 'Only super_admin can rotate API keys.' });
      }

      const keyId = parseInt(req.params.id);
      const { plaintext, newKeyId } = await rotateAPIKey(keyId);

      await createAuditLog(db, {
        userId: (req as any).user.id,
        action: 'apikey.rotated',
        resourceType: 'api_key',
        resourceId: String(keyId),
        newValues: { newKeyId },
        success: true,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      });

      res.json({
        newKeyPlaintext: plaintext,
        newKeyId,
        keyPreview: maskAPIKey(plaintext),
        message: 'API key rotated. Save the new key plaintext now. The old key has been revoked.',
      });
    } catch (error) {
      console.error('Error rotating API key:', error);
      res.status(500).json({ error: 'internal_error', message: 'Failed to rotate API key.' });
    }
  });

  app.delete('/api/admin/api-keys/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
      if ((req as any).user?.role !== 'super_admin') {
        return res.status(403).json({ error: 'forbidden', message: 'Only super_admin can revoke API keys.' });
      }

      const keyId = parseInt(req.params.id);
      const key = await db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).limit(1);

      if (key.length === 0) {
        return res.status(404).json({ error: 'not_found', message: 'API key not found.' });
      }

      await revokeAPIKey(keyId);

      await createAuditLog(db, {
        userId: (req as any).user.id,
        action: 'apikey.revoked',
        resourceType: 'api_key',
        resourceId: String(keyId),
        success: true,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      });

      res.json({ message: 'API key revoked successfully.', id: keyId });
    } catch (error) {
      console.error('Error revoking API key:', error);
      res.status(500).json({ error: 'internal_error', message: 'Failed to revoke API key.' });
    }
  });

  app.get('/api/admin/api-keys/:id/usage', authenticateUser, async (req: Request, res: Response) => {
    try {
      if ((req as any).user?.role !== 'super_admin') {
        return res.status(403).json({ error: 'forbidden', message: 'Only super_admin can view API key usage.' });
      }

      const keyId = parseInt(req.params.id);
      const timeframe = parseInt(req.query.timeframe as string) || 1440;
      const stats = await getAPIKeyUsageStats(keyId, timeframe);

      res.json({ ...stats, timeframeMinutes: timeframe });
    } catch (error) {
      console.error('Error getting API key usage:', error);
      res.status(500).json({ error: 'internal_error', message: 'Failed to get usage statistics.' });
    }
  });

  app.post('/api/user/api-keys', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { name, scopes, expiresAt } = req.body;
      const user = (req as any).user;

      if (!name || !scopes || !Array.isArray(scopes)) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'name and scopes (array) are required.',
        });
      }

      const { valid, invalidScopes } = areValidScopes(scopes);
      if (!valid) {
        return res.status(400).json({
          error: 'invalid_scopes',
          message: `Invalid scopes: ${invalidScopes.join(', ')}`,
        });
      }

      const { plaintext, hash, prefix } = generateAPIKey();

      const [newKey] = await db
        .insert(apiKeys)
        .values({
          createdByUserId: user.id,
          name,
          keyHash: hash,
          keyPrefix: prefix,
          scopes,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        })
        .returning();

      await createAuditLog(db, {
        userId: user.id,
        action: 'apikey.created',
        resourceType: 'api_key',
        resourceId: String(newKey.id),
        newValues: { name, scopes },
        success: true,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      });

      res.json({
        id: newKey.id,
        name,
        keyPlaintext: plaintext,
        keyPreview: maskAPIKey(plaintext),
        scopes,
        message: 'Save the key plaintext now. You will not see it again.',
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      res.status(500).json({ error: 'internal_error', message: 'Failed to create API key.' });
    }
  });

  app.get('/api/user/api-keys', authenticateUser, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const keys = await listAPIKeysByUser(user.id);

      res.json({
        keys: keys.map((key) => ({
          id: key.id,
          name: key.name,
          keyPrefix: key.keyPrefix,
          scopes: key.scopes,
          expiresAt: key.expiresAt,
          isRevoked: key.isRevoked,
          lastUsedAt: key.lastUsedAt,
          usageCount: key.usageCount,
          createdAt: key.createdAt,
        })),
      });
    } catch (error) {
      console.error('Error listing API keys:', error);
      res.status(500).json({ error: 'internal_error', message: 'Failed to list API keys.' });
    }
  });

  app.patch('/api/user/api-keys/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      const user = (req as any).user;
      const keyId = parseInt(req.params.id);

      const key = await db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).limit(1);

      if (key.length === 0 || key[0].createdByUserId !== user.id) {
        return res.status(404).json({ error: 'not_found', message: 'API key not found.' });
      }

      const updates: any = {};
      if (name) updates.name = name;

      await db.update(apiKeys).set(updates).where(eq(apiKeys.id, keyId));

      const updated = await db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).limit(1);

      res.json({
        id: updated[0].id,
        name: updated[0].name,
        keyPrefix: updated[0].keyPrefix,
        scopes: updated[0].scopes,
      });
    } catch (error) {
      console.error('Error updating API key:', error);
      res.status(500).json({ error: 'internal_error', message: 'Failed to update API key.' });
    }
  });

  app.post('/api/user/api-keys/:id/rotate', authenticateUser, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const keyId = parseInt(req.params.id);

      const key = await db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).limit(1);

      if (key.length === 0 || key[0].createdByUserId !== user.id) {
        return res.status(404).json({ error: 'not_found', message: 'API key not found.' });
      }

      const { plaintext, newKeyId } = await rotateAPIKey(keyId);

      await createAuditLog(db, {
        userId: user.id,
        action: 'apikey.rotated',
        resourceType: 'api_key',
        resourceId: String(keyId),
        newValues: { newKeyId },
        success: true,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      });

      res.json({
        newKeyPlaintext: plaintext,
        keyPreview: maskAPIKey(plaintext),
        message: 'API key rotated. Save the new key plaintext now.',
      });
    } catch (error) {
      console.error('Error rotating API key:', error);
      res.status(500).json({ error: 'internal_error', message: 'Failed to rotate API key.' });
    }
  });

  app.delete('/api/user/api-keys/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const keyId = parseInt(req.params.id);

      const key = await db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).limit(1);

      if (key.length === 0 || key[0].createdByUserId !== user.id) {
        return res.status(404).json({ error: 'not_found', message: 'API key not found.' });
      }

      await revokeAPIKey(keyId);

      await createAuditLog(db, {
        userId: user.id,
        action: 'apikey.revoked',
        resourceType: 'api_key',
        resourceId: String(keyId),
        success: true,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      });

      res.json({ message: 'API key revoked successfully.', id: keyId });
    } catch (error) {
      console.error('Error revoking API key:', error);
      res.status(500).json({ error: 'internal_error', message: 'Failed to revoke API key.' });
    }
  });
}
