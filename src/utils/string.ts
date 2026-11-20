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
