import { describe, it, expect } from 'vitest';
import { normalizeString } from '../string';

describe('string utils', () => {
  it('normalizeString handles null/undefined and trims/lowercases', () => {
    expect(normalizeString(null)).toBe('');
    expect(normalizeString(undefined)).toBe('');
    expect(normalizeString('  Hello WORLD  ')).toBe('hello world');
    expect(normalizeString(123)).toBe('123');
  });
});
