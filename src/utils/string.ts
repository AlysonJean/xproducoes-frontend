/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Small string utilities used across the frontend.
 */

/**
 * Normalize a value to a trimmed, lower-cased string.
 * - Converts non-string values with String(value)
 * - Trims whitespace
 * - Converts to lower case
 * - Returns empty string for null/undefined
 */
export function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

/**
 * Normalize using locale-aware lowercasing when specified.
 * Falls back to default toLowerCase when locale is not supported.
 */
export function normalizeStringLocale(value: unknown, locale?: string): string {
  if (value === null || value === undefined) return '';
  const s = String(value).trim();
  try {
    return locale ? s.toLocaleLowerCase(locale) : s.toLowerCase();
    } catch (e) {
    return s.toLowerCase();
  }
}
