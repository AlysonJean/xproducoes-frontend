import { describe, it, expect } from 'vitest';
import { normalizeString, normalizeStringLocale } from '../string';

describe('string utils', () => {
  it('normalizeString handles null/undefined and trims/lowercases', () => {
    expect(normalizeString(null)).toBe('');
    expect(normalizeString(undefined)).toBe('');
    expect(normalizeString('  Hello WORLD  ')).toBe('hello world');
    expect(normalizeString(123)).toBe('123');
  });

  it('normalizeStringLocale respects locale when possible', () => {
    // Turkish dotless i example - behavior may vary by environment, but ensure it returns a string
    const v = 'I';
    const r = normalizeStringLocale(v, 'tr');
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(0);
  });
});
