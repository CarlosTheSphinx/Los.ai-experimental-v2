import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  lookupAPIKey,
  isAPIKeyValid,
  validateScopes,
  checkRateLimit,
  updateKeyLastUsed,
  logAPIKeyUsage,
  extractAPIKeyFromHeader,
} from '../utils/apiKeys';

export interface APIKeyRequestContext {
  apiKeyId: number;
  userId: number;
  scopes: string[];
  keyPreview: string;
  requestId: string;
  startTime: number;
}

declare global {
  namespace Express {
    interface Request {
      apiKey?: APIKeyRequestContext;
    }
  }
}

export async function authenticateAPIKey(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const keyPlaintext = extractAPIKeyFromHeader(authHeader);

  if (!keyPlaintext) {
    return next();
  }

  const requestId = uuidv4();

  try {
    const apiKey = await lookupAPIKey(keyPlaintext);

    if (!apiKey) {
      logAPIKeyUsage({
        apiKeyId: 0,
        endpoint: `${req.method} ${req.path}`,
        method: req.method,
        statusCode: 401,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        scopeRequired: [],
        scopeGranted: [],
        authorized: false,
        errorMessage: 'Invalid API key',
        requestId,
      }).catch(() => {});

      return res.status(401).json({
        error: 'invalid_api_key',
        message: 'The provided API key is invalid or does not exist.',
        request_id: requestId,
      });
    }

    if (!isAPIKeyValid(apiKey)) {
      const reason = apiKey.isRevoked ? 'revoked' : 'expired';

      await logAPIKeyUsage({
        apiKeyId: apiKey.id,
        endpoint: `${req.method} ${req.path}`,
        method: req.method,
        statusCode: 401,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        scopeRequired: [],
        scopeGranted: apiKey.scopes,
        authorized: false,
        errorMessage: `API key is ${reason}`,
        requestId,
      });

      return res.status(401).json({
        error: 'api_key_invalid',
        message: `The API key has been ${reason}.`,
        request_id: requestId,
      });
    }

    const rateLimitResult = await checkRateLimit(apiKey.id);

    if (!rateLimitResult.allowed) {
      await logAPIKeyUsage({
        apiKeyId: apiKey.id,
        endpoint: `${req.method} ${req.path}`,
        method: req.method,
        statusCode: 429,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        scopeRequired: [],
        scopeGranted: apiKey.scopes,
        authorized: false,
        errorMessage: 'Rate limit exceeded',
        requestId,
      });

      res.set('Retry-After', String(rateLimitResult.retryAfter || 60));

      return res.status(429).json({
        error: 'rate_limit_exceeded',
        message: 'API key rate limit exceeded.',
        retry_after: rateLimitResult.retryAfter,
        request_id: requestId,
      });
    }

    req.apiKey = {
      apiKeyId: apiKey.id,
      userId: apiKey.createdByUserId,
      scopes: apiKey.scopes,
      keyPreview: apiKey.keyPrefix,
      requestId,
      startTime: Date.now(),
    };

    const originalSend = res.send;
    res.send = function (data: any) {
      updateKeyLastUsed(apiKey.id).catch((err) => {
        console.error('Failed to update API key last_used_at:', err);
      });

      logAPIKeyUsage({
        apiKeyId: apiKey.id,
        endpoint: `${req.method} ${req.path}`,
        method: req.method,
        statusCode: res.statusCode,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        scopeRequired: [],
        scopeGranted: apiKey.scopes,
        authorized: true,
        requestId,
        responseTimeMs: Date.now() - req.apiKey!.startTime,
      }).catch((err) => {
        console.error('Failed to log API key usage:', err);
      });

      res.send = originalSend;
      return originalSend.call(this, data);
    };

    next();
  } catch (error) {
    console.error('API key authentication error:', error);

    return res.status(500).json({
      error: 'internal_error',
      message: 'An error occurred while authenticating the API key.',
      request_id: requestId,
    });
  }
}

export function requireAPIKeyScope(...requiredScopes: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return next();
    }

    const { valid, missingScopes } = validateScopes(requiredScopes, req.apiKey.scopes);

    if (!valid) {
      await logAPIKeyUsage({
        apiKeyId: req.apiKey.apiKeyId,
        endpoint: `${req.method} ${req.path}`,
        method: req.method,
        statusCode: 403,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        scopeRequired: requiredScopes,
        scopeGranted: req.apiKey.scopes,
        authorized: false,
        errorMessage: `Missing scopes: ${missingScopes.join(', ')}`,
        requestId: req.apiKey.requestId,
        responseTimeMs: Date.now() - req.apiKey.startTime,
      });

      return res.status(403).json({
        error: 'insufficient_scope',
        message: `This operation requires the following scopes: ${requiredScopes.join(', ')}`,
        missing_scopes: missingScopes,
        granted_scopes: req.apiKey.scopes,
        request_id: req.apiKey.requestId,
      });
    }

    next();
  };
}

export function getAuthContext(req: Request): { type: 'user' | 'api_key'; userId: number; id: number | string } | null {
  if (req.apiKey) {
    return {
      type: 'api_key',
      userId: req.apiKey.userId,
      id: req.apiKey.apiKeyId,
    };
  }

  if (req.user) {
    return {
      type: 'user',
      userId: req.user.id,
      id: req.user.id,
    };
  }

  return null;
}
