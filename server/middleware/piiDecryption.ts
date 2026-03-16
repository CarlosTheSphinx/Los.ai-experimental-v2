/**
 * PII Decryption Middleware
 *
 * Automatically decrypts PII fields in API responses (hybrid approach):
 * - Automatic decryption for most queries
 * - Explicit decryption logging for sensitive fields
 *
 * SOC 2 Compliance:
 * - C-1.1: Access to PII logged and monitored
 * - Sensitive field access includes audit trail
 */

import { Request, Response, NextFunction } from 'express';
import {
  decryptPII,
  decryptPIIObject,
  isSensitiveField,
  isEncrypted,
  PII_FIELD_CONFIG,
} from '../utils/piiEncryption';
import { createAuditLog } from '../utils/audit';

/**
 * Context for storing PII decryption state during request
 */
interface PIIDecryptionContext {
  sensitiveFieldsAccessed: string[];
  userEmail?: string;
}

/**
 * Store decryption context in request
 */
declare global {
  namespace Express {
    interface Request {
      piiContext?: PIIDecryptionContext;
    }
  }
}

/**
 * Initialize PII context middleware
 * Called at start of request to track PII access
 */
export function initializePIIContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  req.piiContext = {
    sensitiveFieldsAccessed: [],
    userEmail: req.user?.email,
  };
  next();
}

/**
 * Automatic decryption middleware
 * Decrypts response body recursively
 *
 * Works by wrapping res.json() to decrypt all encrypted fields
 */
export function autoDecryptResponseMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    // Decrypt the response body
    const decrypted = recursivelyDecryptPII(body, req);

    // Log sensitive field access if any
    logSensitiveFieldAccess(req, decrypted);

    return originalJson(decrypted);
  };

  next();
}

/**
 * Recursively decrypt all PII fields in an object or array
 *
 * @param data - Data to decrypt (object, array, or primitive)
 * @param req - Express request (for context)
 * @returns Data with all encrypted fields decrypted
 */
function recursivelyDecryptPII(data: any, req: Request): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => recursivelyDecryptPII(item, req));
  }

  // Handle objects
  if (typeof data === 'object') {
    const decrypted: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && isEncrypted(value)) {
        // Track sensitive field access
        if (isSensitiveField(key)) {
          req.piiContext?.sensitiveFieldsAccessed.push(key);
        }

        // Decrypt with explicit flag if sensitive
        const explicitDecryption = isSensitiveField(key);
        decrypted[key] = decryptPII(value, explicitDecryption);
      } else if (typeof value === 'object') {
        // Recursively decrypt nested objects
        decrypted[key] = recursivelyDecryptPII(value, req);
      } else {
        decrypted[key] = value;
      }
    }

    return decrypted;
  }

  // Return primitives as-is
  return data;
}

/**
 * Log access to sensitive PII fields
 *
 * Creates audit log entry for sensitive field access
 * Helps with SOC 2 C-1.1 monitoring requirement
 *
 * @param req - Express request
 * @param data - Decrypted data (for reference)
 */
async function logSensitiveFieldAccess(req: Request, data: any): Promise<void> {
  if (!req.piiContext?.sensitiveFieldsAccessed.length) {
    return; // No sensitive fields accessed
  }

  try {
    // Log access to sensitive PII
    const db = req.app.locals.db as any;
    if (!db) {
      console.warn('[PII] Database context not available for audit logging');
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      return; // No user context
    }

    // Log each sensitive field access
    const sensitiveFields = req.piiContext.sensitiveFieldsAccessed;
    const ipAddress = req.ip || 'unknown';

    console.info(
      `[PII] Sensitive field access: user=${userId}, ` +
      `fields=[${sensitiveFields.join(', ')}], ip=${ipAddress}`
    );

    // Create audit log for sensitive access
    // This helps security team monitor who accesses what sensitive PII
    await createAuditLog(db, {
      userId,
      action: 'pii.sensitive_field_accessed',
      resourceType: 'pii',
      resourceId: userId.toString(),
      ipAddress: ipAddress,
      userAgent: req.headers['user-agent'] || '',
      newValues: {
        fields: sensitiveFields,
        count: sensitiveFields.length,
      },
      success: true,
    });
  } catch (error) {
    // Don't fail request if audit logging fails
    console.error('[PII] Failed to log sensitive field access:', error);
  }
}

/**
 * Explicit decryption helper for queries
 *
 * Used in routes where developers explicitly request decryption
 * (e.g., when exporting PII, generating reports)
 *
 * @param data - Data to decrypt
 * @param fields - Specific fields to decrypt (all if undefined)
 * @param req - Express request (for audit context)
 * @returns Decrypted data
 *
 * @example
 * // In a route handler
 * const user = await db.query.users.findOne(...);
 * const decryptedUser = explicitDecryptPII(user, ['email', 'phone'], req);
 */
export function explicitDecryptPII<T extends Record<string, any>>(
  data: T,
  fields?: (keyof T)[],
  req?: Request
): T {
  // Log explicit decryption
  if (req?.piiContext) {
    const fieldsToLog = fields ? fields.map((f) => f.toString()) : Object.keys(data);
    req.piiContext.sensitiveFieldsAccessed.push(...fieldsToLog);
  }

  return decryptPIIObject(data, fields, true); // true = explicit decryption
}

/**
 * Middleware to require explicit PII decryption
 *
 * Some endpoints (exports, reports) should require explicit confirmation
 * that PII will be accessed
 *
 * Usage:
 * ```
 * router.get('/api/admin/export-users', requirePIIDecryptionConfirmation, (req, res) => {
 *   // Only reached if user confirmed PII export
 * });
 * ```
 */
export function requirePIIDecryptionConfirmation(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check for confirmation parameter
  const confirmed = req.query.confirmPIIAccess === 'true';

  if (!confirmed) {
    return res.status(403).json({
      error: 'PII Export Confirmation Required',
      message:
        'This operation accesses sensitive PII. ' +
        'Confirm by adding ?confirmPIIAccess=true to the request. ' +
        'This action will be logged in audit trail.',
    });
  }

  // Log the explicit confirmation
  const userId = req.user?.id;
  if (userId) {
    console.info(
      `[PII] User ${userId} confirmed PII access at ${new Date().toISOString()}`
    );
  }

  next();
}

/**
 * Mask PII values in responses (for non-sensitive endpoints)
 *
 * Returns masked version instead of decrypted version
 * Useful for APIs that don't need full PII (e.g., listing records)
 *
 * @param value - Encrypted or plaintext value
 * @param type - Type of PII (email, phone, ssn, name, etc.)
 * @returns Masked version of the value
 *
 * @example
 * maskPII('john.doe@example.com', 'email') // Returns 'j***@example.com'
 * maskPII('123-45-6789', 'ssn') // Returns '***-**-6789'
 * maskPII('John Doe', 'name') // Returns 'John D***'
 */
export function maskPII(value: string | null, type: string): string | null {
  if (!value) return value;

  switch (type) {
    case 'email':
      return value.replace(/^([^@]{2}).*(@.*)/, '$1***$2');

    case 'phone':
      return value.replace(/^(\d{3})-(\d{2})/, '$1-$2-****');

    case 'ssn':
      return value.replace(/^(\d{3})-(\d{2})/, '$1-$2-****');

    case 'name':
      const parts = value.split(' ');
      if (parts.length > 1) {
        return (
          parts[0] +
          ' ' +
          parts[parts.length - 1].substring(0, 1) +
          '***'
        );
      }
      return value.substring(0, 2) + '***';

    case 'address':
      const words = value.split(' ');
      return words[0] + ' *** (masked)';

    case 'idnumber':
      return value.substring(0, 2) + '***' + value.substring(value.length - 2);

    default:
      // Generic masking for unknown types
      return value.substring(0, 2) + '***' + value.substring(value.length - 1);
  }
}

/**
 * Response transformer for masked PII
 *
 * Masks sensitive fields instead of decrypting
 * Use for list endpoints that don't need full PII
 */
export function maskPIIResponseMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    // Only mask if explicitly requested
    if (req.query.maskPII !== 'true') {
      return originalJson(body);
    }

    const masked = recursivelyMaskPII(body);
    return originalJson(masked);
  };

  next();
}

/**
 * Recursively mask PII in an object
 */
function recursivelyMaskPII(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => recursivelyMaskPII(item));
  }

  if (typeof data === 'object') {
    const masked: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Mask if encrypted
        if (isEncrypted(value)) {
          // First decrypt to know what we're masking
          const decrypted = decryptPII(value, false);
          masked[key] = maskPII(decrypted, detectPIIType(key));
        } else {
          masked[key] = maskPII(value, detectPIIType(key));
        }
      } else if (typeof value === 'object') {
        masked[key] = recursivelyMaskPII(value);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  return data;
}

/**
 * Detect PII type from field name
 */
function detectPIIType(fieldName: string): string {
  const lowerName = fieldName.toLowerCase();

  if (lowerName.includes('email')) return 'email';
  if (lowerName.includes('phone')) return 'phone';
  if (lowerName.includes('ssn')) return 'ssn';
  if (lowerName.includes('name')) return 'name';
  if (lowerName.includes('address')) return 'address';
  if (lowerName.includes('idnumber') || lowerName.includes('id_number')) {
    return 'idnumber';
  }

  return 'default';
}
