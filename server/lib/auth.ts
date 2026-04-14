import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  specialChars: "!@#$%^&*()_+-=[]{}|;:,.<>?",
  expiryDays: 90,
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 30,
};

export const PASSWORD_HISTORY_LENGTH = 5;

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(
      `Password must be at least ${PASSWORD_POLICY.minLength} characters long`
    );
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (PASSWORD_POLICY.requireNumber && !/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (
    PASSWORD_POLICY.requireSpecialChar &&
    !password.split('').some(c => PASSWORD_POLICY.specialChars.includes(c))
  ) {
    errors.push(
      `Password must contain at least one special character: ${PASSWORD_POLICY.specialChars}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Failed to hash password");
  }
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    console.error("Error verifying password:", error);
    return false;
  }
}

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

const TOKEN_EXPIRY_HOURS = 24;
const TOKEN_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

export function generateSessionToken(
  userId: number,
  email: string,
  role: string
): string {
  try {
    const payload = {
      userId,
      email,
      role,
    };

    const token = jwt.sign(payload, TOKEN_SECRET, {
      expiresIn: `${TOKEN_EXPIRY_HOURS}h`,
    });

    return token;
  } catch (error) {
    console.error("Error generating session token:", error);
    throw new Error("Failed to generate session token");
  }
}

export function verifySessionToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, TOKEN_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error("Error verifying session token:", error);
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }

  return parts[1];
}

export interface LoginAttemptContext {
  email: string;
  ipAddress: string;
  userAgent: string;
}

export function isAccountLocked(
  failedAttempts: number,
  lockedUntil: Date | null
): boolean {
  if (failedAttempts < PASSWORD_POLICY.maxFailedAttempts) {
    return false;
  }

  if (!lockedUntil) {
    return false;
  }

  const now = new Date();
  return lockedUntil > now;
}

export function calculateLockoutUntil(): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() + PASSWORD_POLICY.lockoutDurationMinutes);
  return now;
}

export function calculatePasswordExpiry(): Date {
  const now = new Date();
  now.setDate(now.getDate() + PASSWORD_POLICY.expiryDays);
  return now;
}

export function isPasswordExpired(expiresAt: Date | null): boolean {
  if (!expiresAt || PASSWORD_POLICY.expiryDays === null) {
    return false;
  }

  const now = new Date();
  return expiresAt < now;
}
