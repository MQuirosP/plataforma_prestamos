/**
 * Utility functions for input validation and sanitization.
 * Helps prevent XSS, SQL injection, and invalid state transitions.
 */

/**
 * Sanitizes a string by trimming it and stripping any HTML tags to prevent XSS.
 */
export function sanitizeString(val: any, maxLength = 255): string {
  if (typeof val !== 'string') {
    return '';
  }
  let clean = val.trim();
  // Strip HTML tags using regex
  clean = clean.replace(/<\/?[^>]+(>|$)/g, '');
  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength);
  }
  return clean;
}

/**
 * Sanitizes a phone number, allowing only digits, '+' symbol, spaces, and hyphens.
 */
export function sanitizePhone(val: any): string {
  if (typeof val !== 'string') {
    return '';
  }
  let clean = val.trim();
  // Allow only digits, +, -, and spaces
  clean = clean.replace(/[^0-9+\-\s]/g, '');
  if (clean.length > 30) {
    clean = clean.substring(0, 30);
  }
  return clean;
}

/**
 * Sanitizes an alphanumeric username (lowercase, letters, numbers, and underscores only).
 */
export function sanitizeUsername(val: any): string {
  if (typeof val !== 'string') {
    return '';
  }
  let clean = val.trim().toLowerCase();
  // Allow only letters, numbers, and underscores
  clean = clean.replace(/[^a-z0-9_]/g, '');
  if (clean.length > 30) {
    clean = clean.substring(0, 30);
  }
  return clean;
}

/**
 * Validates email format.
 */
export function isValidEmail(val: any): boolean {
  if (typeof val !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(val.trim()) && val.trim().length <= 255;
}

/**
 * Validates username format (alphanumeric, underscores, 3-30 chars).
 */
export function isValidUsername(val: any): boolean {
  if (typeof val !== 'string') {
    return false;
  }
  const usernameRegex = /^[a-z0-9_]{3,30}$/;
  return usernameRegex.test(val);
}

/**
 * Parses and validates positive numeric input.
 * Returns null if invalid.
 */
export function validatePositiveNumber(val: any, allowZero = false): number | null {
  const parsed = Number(val);
  if (isNaN(parsed)) {
    return null;
  }
  if (allowZero) {
    return parsed >= 0 ? parsed : null;
  }
  return parsed > 0 ? parsed : null;
}

/**
 * Parses and validates an integer within a specific range.
 */
export function validateIntegerRange(val: any, min: number, max: number): number | null {
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) {
    return null;
  }
  return (parsed >= min && parsed <= max) ? parsed : null;
}
