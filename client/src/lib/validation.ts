/**
 * Shared validation utilities for phone and email fields across all forms.
 */

/**
 * Format a phone number string to (XXX) XXX-XXXX as the user types.
 * Strips non-digit characters, limits to 10 digits.
 */
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Validate that a phone number has exactly 10 digits.
 * Returns true if valid or empty (empty = optional field).
 */
export function isValidPhone(value: string): boolean {
  if (!value || !value.trim()) return true; // empty is ok (optional)
  const digits = value.replace(/\D/g, "");
  return digits.length === 10;
}

/**
 * Basic email validation.
 * Returns true if valid or empty (empty = optional field).
 */
export function isValidEmail(value: string): boolean {
  if (!value || !value.trim()) return true; // empty is ok (optional)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Get validation error message for phone field.
 */
export function getPhoneError(value: string): string | null {
  if (!value || !value.trim()) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length > 0 && digits.length < 10) return "Phone number must be 10 digits";
  return null;
}

/**
 * Get validation error message for email field.
 */
export function getEmailError(value: string): string | null {
  if (!value || !value.trim()) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Invalid email address";
  return null;
}
