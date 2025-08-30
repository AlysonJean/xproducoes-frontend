import { describe, test, expect } from 'vitest';
import { isSafeWebsite } from '../url';

describe('isSafeWebsite', () => {
  test('rejects empty and null', () => {
    expect(isSafeWebsite(undefined)).toBe(false);
    expect(isSafeWebsite(null)).toBe(false);
    expect(isSafeWebsite('')).toBe(false);
  });

  test('rejects non-https', () => {
    expect(isSafeWebsite('http://example.com')).toBe(false);
  });

  test('rejects localhost and private IPs', () => {
    expect(isSafeWebsite('https://localhost/')).toBe(false);
    expect(isSafeWebsite('https://127.0.0.1/')).toBe(false);
    expect(isSafeWebsite('https://10.0.0.5/')).toBe(false);
    expect(isSafeWebsite('https://192.168.1.1/')).toBe(false);
  });

  test('rejects IP literals even https', () => {
    expect(isSafeWebsite('https://8.8.8.8/')).toBe(false);
  });

  test('accepts valid https hostnames', () => {
    expect(isSafeWebsite('https://example.com')).toBe(true);
    expect(isSafeWebsite('https://sub.domain.example.com/path')).toBe(true);
  });

  test('rejects userinfo in URL', () => {
    expect(isSafeWebsite('https://user:pass@example.com/')).toBe(false);
  });

  test('rejects IPv6 literal', () => {
    expect(isSafeWebsite('https://[2001:db8::1]/')).toBe(false);
  });

  test('rejects extremely long urls', () => {
    const long = 'https://' + 'a'.repeat(5000) + '.com/';
    expect(isSafeWebsite(long)).toBe(false);
  });
});
