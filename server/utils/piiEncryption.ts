/**
 * PII Encryption Utility
 *
 * Provides application-level encryption for Personally Identifiable Information (PII)
 * using AES-256-GCM (Galois/Counter Mode) for authenticated encryption.
 *
 * Features:
 * - Encrypts sensitive fields at application level (before database storage)
 * - Supports multiple field types (strings, numbers, dates)
 * - Automatic decryption in queries (transparent to application)
 * - Explicit decryption for sensitive operations (audit trail)
 * - Backward compatibility with unencrypted data (migration support)
 * - Tamper detection via authentication tags
 *
 * SOC 2 Compliance:
 * - CC-6.2: Encryption of sensitive data
 * - C-1.1: Confidentiality of personally identifiable information
 */

import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16;

// Encryption format: `enc:version:iv:authTag:ciphertext`
// version allows future algorithm changes without breaking existing data
const ENCRYPTION_VERSION = '1';
const ENCRYPTION_PREFIX = `enc:${ENCRYPTION_VERSION}:`;

/**
 * Get encryption key from environment
 * Must be 32 bytes (256 bits) hex-encoded string
 */
function getEncryptionKey(): Buffer {
  const key = process.env.PII_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'PII_ENCRYPTION_KEY environment variable not set. ' +
      'Set a 64-character hex string (32 bytes for AES-256): ' +
      'PII_ENCRYPTION_KEY=$(openssl rand -hex 32)'
    );
  }

  if (key.length !== 64) {
    throw new Error(
      `PII_ENCRYPTION_KEY must be 64 hex characters (32 bytes), got ${key.length}`
    );
  }

  try {
    return Buffer.from(key, 'hex');
  } catch (error) {
    throw new Error('PII_ENCRYPTION_KEY must be valid hex string');
  }
}

/**
 * Encrypt a PII value
 *
 * @param plaintext - Value to encrypt (string or null)
 * @returns Encrypted value in format `enc:version:iv:authTag:ciphertext` or null
 *
 * @example
 * const encrypted = encryptPII('123-45-6789');
 * // Returns: 'enc:1:a1b2c3d4e5f6...:f1e2d3c4...:9a8b7c6d5e4f3a2b1c0d9e8f...'
 */
export function encryptPII(plaintext: string | null): string | null {
  // Handle null values
  if (plaintext === null || plaintext === undefined) {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher with random IV
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt plaintext
    let ciphertext = cipher.update(plaintext, 'utf-8', 'hex');
    ciphertext += cipher.final('hex');

    // Get authentication tag (ensures data integrity and authenticity)
    const authTag = cipher.getAuthTag();

    // Return encrypted format: enc:version:iv:authTag:ciphertext
    return `${ENCRYPTION_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
  } catch (error) {
    console.error('[PII Encryption] Failed to encrypt value:', error);
    throw new Error(`Failed to encrypt PII: ${(error as Error).message}`);
  }
}

/**
 * Decrypt a PII value
 *
 * @param encrypted - Encrypted value in format `enc:version:iv:authTag:ciphertext`
 * @param explicitDecryption - If true, logs the decryption (for sensitive operations)
 * @returns Decrypted plaintext or null if invalid
 * @throws If decryption fails (authentication tag mismatch = tampering detected)
 *
 * @example
 * const plaintext = decryptPII('enc:1:a1b2c3d4e5f6...:f1e2d3c4...:9a8b7c6d5e4f3a2b1c0d9e8f...');
 * // Returns: '123-45-6789'
 */
export function decryptPII(
  encrypted: string | null,
  explicitDecryption: boolean = false
): string | null {
  // Handle null values
  if (encrypted === null || encrypted === undefined) {
    return null;
  }

  // Handle non-encrypted (legacy) values
  if (!encrypted.startsWith('enc:')) {
    // Log access to unencrypted PII (should not happen after migration)
    if (explicitDecryption) {
      console.warn('[PII Encryption] Accessed unencrypted PII value (legacy data)');
    }
    return encrypted; // Return as-is for backward compatibility
  }

  try {
    const key = getEncryptionKey();

    // Parse encrypted format: enc:version:iv:authTag:ciphertext
    const parts = encrypted.split(':');
    if (parts.length < 4) {
      throw new Error('Invalid encryption format: expected enc:version:iv:authTag:ciphertext');
    }

    const [prefix, version, ivHex, authTagHex, ciphertext] = parts;

    // Verify format
    if (prefix !== 'enc' || version !== ENCRYPTION_VERSION) {
      throw new Error(`Unsupported encryption format: ${prefix}:${version}`);
    }

    // Parse IV and auth tag
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: ${iv.length}, expected ${IV_LENGTH}`);
    }

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(`Invalid auth tag length: ${authTag.length}, expected ${AUTH_TAG_LENGTH}`);
    }

    // Create decipher with IV and auth tag
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt ciphertext
    let plaintext = decipher.update(ciphertext, 'hex', 'utf-8');
    plaintext += decipher.final('utf-8');

    // Log explicit decryption (for audit trail)
    if (explicitDecryption) {
      console.info('[PII Encryption] Explicit decryption of PII (sensitive operation)');
    }

    return plaintext;
  } catch (error) {
    if ((error as Error).message.includes('Unsupported encryption format')) {
      // Unknown format, return as-is (backward compatibility)
      return encrypted;
    }

    // Tampering detected (auth tag mismatch)
    if ((error as Error).message.includes('Unsupported state or unable to authenticate data')) {
      console.error('[PII Encryption] TAMPERING DETECTED: Authentication tag mismatch');
      throw new Error('PII data corruption detected: authentication tag mismatch (possible tampering)');
    }

    console.error('[PII Encryption] Failed to decrypt value:', error);
    throw new Error(`Failed to decrypt PII: ${(error as Error).message}`);
  }
}

/**
 * Decrypt multiple PII values (batch operation)
 *
 * @param encrypted - Object with encrypted values
 * @param fields - Fields to decrypt (optional, decrypts all if not specified)
 * @param explicitDecryption - If true, logs decryption (for audit trail)
 * @returns Object with decrypted values
 *
 * @example
 * const decrypted = decryptPIIObject(
 *   { firstName: 'enc:1:...', lastName: 'enc:1:...' },
 *   ['firstName', 'lastName'],
 *   true // explicit decryption
 * );
 */
export function decryptPIIObject<T extends Record<string, any>>(
  encrypted: T,
  fields: (keyof T)[] | undefined = undefined,
  explicitDecryption: boolean = false
): T {
  const fieldsToDecrypt = fields || (Object.keys(encrypted) as (keyof T)[]);
  const decrypted = { ...encrypted };

  for (const field of fieldsToDecrypt) {
    const value = encrypted[field];
    if (typeof value === 'string') {
      decrypted[field] = decryptPII(value, explicitDecryption) as any;
    }
  }

  return decrypted;
}

/**
 * Check if a value is encrypted
 *
 * @param value - Value to check
 * @returns true if value is in encrypted format
 */
export function isEncrypted(value: string | null): boolean {
  return value !== null && value !== undefined && value.startsWith('enc:');
}

/**
 * Force encrypt a value (for data migration)
 *
 * Encrypts value if plaintext, returns as-is if already encrypted
 *
 * @param value - Value to encrypt
 * @returns Encrypted value
 */
export function ensureEncrypted(value: string | null): string | null {
  if (!value) return value;
  if (isEncrypted(value)) return value;
  return encryptPII(value);
}

/**
 * Force decrypt a value (for data migration or sensitive operations)
 *
 * Decrypts value if encrypted, returns as-is if plaintext
 *
 * @param value - Value to decrypt
 * @param explicitDecryption - If true, logs decryption
 * @returns Decrypted value
 */
export function ensureDecrypted(
  value: string | null,
  explicitDecryption: boolean = false
): string | null {
  if (!value) return value;
  if (!isEncrypted(value)) return value;
  return decryptPII(value, explicitDecryption);
}

/**
 * Encrypt an object with multiple PII fields
 *
 * @param obj - Object with plaintext PII fields
 * @param fields - List of fields to encrypt
 * @returns Object with encrypted fields
 *
 * @example
 * const encrypted = encryptPIIObject(
 *   { firstName: 'John', lastName: 'Doe', ssn: '123-45-6789' },
 *   ['firstName', 'lastName', 'ssn']
 * );
 */
export function encryptPIIObject<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const encrypted = { ...obj };

  for (const field of fields) {
    const value = obj[field];
    if (typeof value === 'string') {
      encrypted[field] = encryptPII(value) as any;
    }
  }

  return encrypted;
}

/**
 * Configuration for automatic PII encryption/decryption
 * Defines which fields in which tables should be encrypted
 */
export const PII_FIELD_CONFIG = {
  users: {
    level: 'L3' as const,
    fields: [
      'email',
      'fullName',
      'phone',
      'companyName',
      'googleId',
      'microsoftId',
    ],
    sensitive: ['email', 'phone'],
  },
  borrowerProfiles: {
    level: 'L3-L4' as const,
    fields: [
      'email',
      'firstName',
      'lastName',
      'phone',
      'dateOfBirth',
      'streetAddress',
      'city',
      'state',
      'zipCode',
      'ssnLast4',
      'idType',
      'idNumber',
      'idExpirationDate',
      'employerName',
      'employmentTitle',
      'annualIncome',
      'employmentType',
      'entityName',
      'entityType',
      'einNumber',
    ],
    sensitive: [
      'ssnLast4',
      'idNumber',
      'einNumber',
      'dateOfBirth',
    ],
  },
  projects: {
    level: 'L3' as const,
    fields: [
      'borrowerName',
      'borrowerEmail',
      'borrowerPhone',
      'propertyAddress',
    ],
    sensitive: [],
  },
  savedQuotes: {
    level: 'L3' as const,
    fields: [
      'customerFirstName',
      'customerLastName',
      'customerEmail',
      'customerPhone',
    ],
    sensitive: [],
  },
  partners: {
    level: 'L3' as const,
    fields: ['name', 'email', 'phone', 'companyName'],
    sensitive: [],
  },
  signers: {
    level: 'L3' as const,
    fields: ['name', 'email'],
    sensitive: [],
  },
  dealThirdParties: {
    level: 'L3' as const,
    fields: ['name', 'email', 'phone', 'company'],
    sensitive: [],
  },
  auditLogs: {
    level: 'L3' as const,
    fields: ['userEmail', 'ipAddress', 'userAgent'],
    sensitive: [],
  },
  loginAttempts: {
    level: 'L3' as const,
    fields: ['email', 'ipAddress', 'userAgent'],
    sensitive: [],
  },
} as const;

/**
 * Get list of all PII fields requiring encryption
 *
 * @returns Array of all PII field names
 */
export function getAllPIIFields(): string[] {
  const fields: string[] = [];

  for (const tableConfig of Object.values(PII_FIELD_CONFIG)) {
    fields.push(...tableConfig.fields);
  }

  return [...new Set(fields)]; // Remove duplicates
}

/**
 * Get list of sensitive fields requiring explicit decryption logging
 *
 * @returns Array of sensitive field names
 */
export function getSensitiveFields(): string[] {
  const fields: string[] = [];

  for (const tableConfig of Object.values(PII_FIELD_CONFIG)) {
    fields.push(...(tableConfig.sensitive || []));
  }

  return [...new Set(fields)]; // Remove duplicates
}

/**
 * Check if a field should require explicit decryption logging
 *
 * @param field - Field name to check
 * @returns true if field is sensitive and should log decryption
 */
export function isSensitiveField(field: string): boolean {
  return getSensitiveFields().includes(field);
}

// Export types
export type PIIFieldConfig = typeof PII_FIELD_CONFIG;
export type PIITable = keyof PIIFieldConfig;
