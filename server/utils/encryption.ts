import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    console.warn('TOKEN_ENCRYPTION_KEY not set. OAuth tokens will be stored unencrypted.');
    return Buffer.alloc(0);
  }
  // Key should be 64 hex chars (32 bytes)
  return Buffer.from(key, 'hex');
}

export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  if (key.length === 0) return plaintext;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all hex)
  return `enc:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptToken(ciphertext: string): string {
  // If not encrypted (no enc: prefix), return as-is for backward compatibility
  if (!ciphertext.startsWith('enc:')) return ciphertext;

  const key = getEncryptionKey();
  if (key.length === 0) {
    console.error('TOKEN_ENCRYPTION_KEY not set but encrypted token found. Cannot decrypt.');
    throw new Error('Encryption key required to decrypt tokens');
  }

  const parts = ciphertext.split(':');
  if (parts.length !== 4) throw new Error('Invalid encrypted token format');

  const iv = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');
  const encrypted = parts[3];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
