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
 * Texto para comparar em buscas: sem acento, minúsculo e sem espaços nas pontas. Teste do painel de 25/11/2026 (A-14):
 * "Joao" não achava "João" e "fumaca" não achava "fumaça" nas listas do painel.
 */
export function searchText(value: unknown): string {
  return normalizeString(value).normalize('NFD').replace(/[̀-ͯ]/g, '');
}
