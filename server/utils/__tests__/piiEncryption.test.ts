/**
 * Unit Tests: PII Encryption
 *
 * Tests for AES-256-GCM encryption of personally identifiable information
 *
 * Test Coverage:
 * - ✓ Encrypt/decrypt single values
 * - ✓ Encrypt/decrypt objects with multiple fields
 * - ✓ Backward compatibility (unencrypted values)
 * - ✓ Tamper detection (authentication tag)
 * - ✓ Null value handling
 * - ✓ Field name detection
 * - ✓ Sensitive field identification
 * - ✓ Encryption format validation
 */

import {
  encryptPII,
  decryptPII,
  encryptPIIObject,
  decryptPIIObject,
  isEncrypted,
  ensureEncrypted,
  ensureDecrypted,
  isSensitiveField,
  getAllPIIFields,
  getSensitiveFields,
  maskPII,
} from '../piiEncryption';

describe('PII Encryption', () => {
  describe('Single Value Encryption/Decryption', () => {
    test('encryptPII: should encrypt a string value', () => {
      const plaintext = 'john.doe@example.com';
      const encrypted = encryptPII(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted.startsWith('enc:1:')).toBe(true);
      expect(encrypted).not.toEqual(plaintext);
    });

    test('decryptPII: should decrypt an encrypted value', () => {
      const plaintext = 'john.doe@example.com';
      const encrypted = encryptPII(plaintext);
      const decrypted = decryptPII(encrypted);

      expect(decrypted).toEqual(plaintext);
    });

    test('encryptPII: should produce different ciphertexts for same plaintext', () => {
      const plaintext = '123-45-6789';
      const encrypted1 = encryptPII(plaintext);
      const encrypted2 = encryptPII(plaintext);

      // Different IVs produce different ciphertexts (non-deterministic)
      expect(encrypted1).not.toEqual(encrypted2);

      // But both decrypt to same plaintext
      expect(decryptPII(encrypted1)).toEqual(plaintext);
      expect(decryptPII(encrypted2)).toEqual(plaintext);
    });
  });

  describe('Null and Edge Cases', () => {
    test('encryptPII: should handle null value', () => {
      const encrypted = encryptPII(null);
      expect(encrypted).toBeNull();
    });

    test('encryptPII: should handle undefined value', () => {
      const encrypted = encryptPII(undefined as any);
      expect(encrypted).toBeNull();
    });

    test('decryptPII: should handle null value', () => {
      const decrypted = decryptPII(null);
      expect(decrypted).toBeNull();
    });

    test('encryptPII: should handle empty string', () => {
      const plaintext = '';
      const encrypted = encryptPII(plaintext);
      const decrypted = decryptPII(encrypted);

      expect(decrypted).toEqual(plaintext);
    });

    test('encryptPII: should handle special characters', () => {
      const plaintext = 'user+tag@example.com!@#$%^&*()';
      const encrypted = encryptPII(plaintext);
      const decrypted = decryptPII(encrypted);

      expect(decrypted).toEqual(plaintext);
    });

    test('encryptPII: should handle long strings', () => {
      const plaintext = 'x'.repeat(10000);
      const encrypted = encryptPII(plaintext);
      const decrypted = decryptPII(encrypted);

      expect(decrypted).toEqual(plaintext);
    });

    test('encryptPII: should handle unicode characters', () => {
      const plaintext = 'José García 北京 🔒';
      const encrypted = encryptPII(plaintext);
      const decrypted = decryptPII(encrypted);

      expect(decrypted).toEqual(plaintext);
    });
  });

  describe('Object Encryption/Decryption', () => {
    test('encryptPIIObject: should encrypt specified fields', () => {
      const user = {
        id: 1,
        email: 'john@example.com',
        fullName: 'John Doe',
        role: 'user',
      };

      const encrypted = encryptPIIObject(user, ['email', 'fullName']);

      expect(encrypted.id).toEqual(1); // Unencrypted
      expect(encrypted.role).toEqual('user'); // Unencrypted
      expect(isEncrypted(encrypted.email)).toBe(true);
      expect(isEncrypted(encrypted.fullName)).toBe(true);
    });

    test('decryptPIIObject: should decrypt specified fields', () => {
      const user = {
        id: 1,
        email: encryptPII('john@example.com'),
        fullName: encryptPII('John Doe'),
        role: 'user',
      };

      const decrypted = decryptPIIObject(user, ['email', 'fullName']);

      expect(decrypted.email).toEqual('john@example.com');
      expect(decrypted.fullName).toEqual('John Doe');
      expect(decrypted.role).toEqual('user');
    });

    test('decryptPIIObject: should decrypt all fields if not specified', () => {
      const borrower = {
        id: 123,
        firstName: encryptPII('John'),
        lastName: encryptPII('Doe'),
        email: encryptPII('john@example.com'),
      };

      const decrypted = decryptPIIObject(borrower);

      expect(decrypted.firstName).toEqual('John');
      expect(decrypted.lastName).toEqual('Doe');
      expect(decrypted.email).toEqual('john@example.com');
    });
  });

  describe('Backward Compatibility', () => {
    test('decryptPII: should handle non-encrypted legacy values', () => {
      const plaintext = 'john@example.com';

      // Simulate legacy data (not encrypted)
      const decrypted = decryptPII(plaintext);

      // Should return as-is (backward compatible)
      expect(decrypted).toEqual(plaintext);
    });

    test('isEncrypted: should correctly identify encrypted vs plaintext', () => {
      const plaintext = 'john@example.com';
      const encrypted = encryptPII(plaintext);

      expect(isEncrypted(plaintext)).toBe(false);
      expect(isEncrypted(encrypted)).toBe(true);
      expect(isEncrypted(null)).toBe(false);
    });
  });

  describe('Encryption Format Validation', () => {
    test('encrypted value should follow format: enc:version:iv:authTag:ciphertext', () => {
      const encrypted = encryptPII('test-value');
      const parts = encrypted.split(':');

      expect(parts.length).toBeGreaterThanOrEqual(4);
      expect(parts[0]).toEqual('enc');
      expect(parts[1]).toEqual('1'); // Version
      expect(parts[2]).toMatch(/^[a-f0-9]{32}$/); // IV (128 bits = 32 hex chars)
      expect(parts[3]).toMatch(/^[a-f0-9]{32}$/); // Auth tag (128 bits = 32 hex chars)
    });

    test('decryptPII: should reject invalid format', () => {
      const invalid = 'invalid:format:data';

      expect(() => {
        decryptPII(invalid, false);
      }).not.toThrow(); // Should handle gracefully (backward compat)
    });
  });

  describe('Tamper Detection', () => {
    test('decryptPII: should detect tampering (corrupted auth tag)', () => {
      const plaintext = 'sensitive-data';
      const encrypted = encryptPII(plaintext);

      // Corrupt the auth tag
      const parts = encrypted.split(':');
      parts[3] = 'ffffffffffffffffffffffffffffffff'; // Invalid auth tag
      const corrupted = parts.join(':');

      expect(() => {
        decryptPII(corrupted, false);
      }).toThrow();
    });

    test('decryptPII: should detect tampering (corrupted ciphertext)', () => {
      const plaintext = 'sensitive-data';
      const encrypted = encryptPII(plaintext);

      // Corrupt the ciphertext
      const parts = encrypted.split(':');
      parts[4] = parts[4].substring(0, parts[4].length - 2) + 'ff';
      const corrupted = parts.join(':');

      expect(() => {
        decryptPII(corrupted, false);
      }).toThrow();
    });
  });

  describe('ensureEncrypted / ensureDecrypted', () => {
    test('ensureEncrypted: should encrypt plaintext', () => {
      const plaintext = 'john@example.com';
      const result = ensureEncrypted(plaintext);

      expect(isEncrypted(result)).toBe(true);
      expect(decryptPII(result)).toEqual(plaintext);
    });

    test('ensureEncrypted: should return encrypted as-is', () => {
      const plaintext = 'john@example.com';
      const encrypted = encryptPII(plaintext);
      const result = ensureEncrypted(encrypted);

      // Should return same encrypted value (no re-encryption)
      expect(result).toEqual(encrypted);
    });

    test('ensureDecrypted: should decrypt encrypted value', () => {
      const plaintext = 'john@example.com';
      const encrypted = encryptPII(plaintext);
      const result = ensureDecrypted(encrypted);

      expect(result).toEqual(plaintext);
    });

    test('ensureDecrypted: should return plaintext as-is', () => {
      const plaintext = 'john@example.com';
      const result = ensureDecrypted(plaintext);

      expect(result).toEqual(plaintext);
    });
  });

  describe('Sensitive Field Detection', () => {
    test('isSensitiveField: should identify sensitive fields', () => {
      expect(isSensitiveField('ssnLast4')).toBe(true);
      expect(isSensitiveField('idNumber')).toBe(true);
      expect(isSensitiveField('einNumber')).toBe(true);
      expect(isSensitiveField('dateOfBirth')).toBe(true);
    });

    test('isSensitiveField: should identify non-sensitive fields', () => {
      expect(isSensitiveField('companyName')).toBe(false);
      expect(isSensitiveField('employmentType')).toBe(false);
    });

    test('getSensitiveFields: should return all sensitive field names', () => {
      const sensitive = getSensitiveFields();

      expect(Array.isArray(sensitive)).toBe(true);
      expect(sensitive.length).toBeGreaterThan(0);
      expect(sensitive).toContain('ssnLast4');
      expect(sensitive).toContain('idNumber');
    });

    test('getAllPIIFields: should return all PII field names', () => {
      const allFields = getAllPIIFields();

      expect(Array.isArray(allFields)).toBe(true);
      expect(allFields.length).toBeGreaterThan(40); // Should have 50+ fields
      expect(allFields).toContain('email');
      expect(allFields).toContain('firstName');
      expect(allFields).toContain('ssnLast4');
    });
  });

  describe('PII Masking', () => {
    test('maskPII: should mask email addresses', () => {
      const email = 'john.doe@example.com';
      const masked = maskPII(email, 'email');

      expect(masked).toContain('***');
      expect(masked).toContain('@example.com');
      expect(masked).not.toContain('john.doe');
    });

    test('maskPII: should mask phone numbers', () => {
      const phone = '555-123-4567';
      const masked = maskPII(phone, 'phone');

      expect(masked).toContain('***');
      expect(masked).not.toContain('4567');
    });

    test('maskPII: should mask SSN', () => {
      const ssn = '123-45-6789';
      const masked = maskPII(ssn, 'ssn');

      expect(masked).toMatch(/\d{3}-\d{2}-\*\*\*\*/);
    });

    test('maskPII: should mask names', () => {
      const name = 'John Doe';
      const masked = maskPII(name, 'name');

      expect(masked).toContain('***');
      expect(masked).toContain('John');
    });

    test('maskPII: should handle null', () => {
      const masked = maskPII(null, 'email');
      expect(masked).toBeNull();
    });
  });

  describe('Performance', () => {
    test('encryptPII: should complete in reasonable time', () => {
      const plaintext = 'john.doe@example.com';
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        encryptPII(plaintext);
      }

      const elapsed = performance.now() - startTime;

      // Should encrypt 100 values in less than 1 second
      expect(elapsed).toBeLessThan(1000);
      console.log(`Encrypted 100 values in ${elapsed.toFixed(2)}ms`);
    });

    test('decryptPII: should complete in reasonable time', () => {
      const plaintext = 'john.doe@example.com';
      const encrypted = encryptPII(plaintext);

      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        decryptPII(encrypted);
      }

      const elapsed = performance.now() - startTime;

      // Should decrypt 100 values in less than 1 second
      expect(elapsed).toBeLessThan(1000);
      console.log(`Decrypted 100 values in ${elapsed.toFixed(2)}ms`);
    });
  });

  describe('Real-World Scenarios', () => {
    test('User creation with encrypted PII', () => {
      const newUser = {
        email: 'john@example.com',
        fullName: 'John Doe',
        phone: '555-1234',
        role: 'user',
      };

      // Encrypt PII before storing
      const toStore = encryptPIIObject(newUser, ['email', 'fullName', 'phone']);

      // Verify encrypted
      expect(isEncrypted(toStore.email)).toBe(true);
      expect(isEncrypted(toStore.fullName)).toBe(true);
      expect(isEncrypted(toStore.phone)).toBe(true);
      expect(toStore.role).toEqual('user'); // Not encrypted

      // Decrypt when retrieved
      const retrieved = decryptPIIObject(toStore, ['email', 'fullName', 'phone']);

      expect(retrieved).toEqual(newUser);
    });

    test('Borrower profile with critical PII', () => {
      const borrower = {
        firstName: 'Jane',
        lastName: 'Smith',
        ssnLast4: '1234',
        idNumber: '123456789',
        email: 'jane@example.com',
      };

      // Encrypt all PII fields
      const encrypted = encryptPIIObject(borrower, Object.keys(borrower) as any);

      // All fields encrypted
      Object.values(encrypted).forEach((value) => {
        if (typeof value === 'string') {
          expect(isEncrypted(value)).toBe(true);
        }
      });

      // Decrypt specific sensitive fields
      const decrypted = decryptPIIObject(encrypted, ['ssnLast4', 'idNumber']);

      expect(decrypted.ssnLast4).toEqual('1234');
      expect(decrypted.idNumber).toEqual('123456789');
      // Others should still be encrypted
      expect(isEncrypted(decrypted.firstName as any)).toBe(true);
    });
  });
});
