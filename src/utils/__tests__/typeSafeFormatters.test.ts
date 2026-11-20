
import { describe, it, expect } from 'vitest';
import {
  toNumber,
  formatPrice,
  formatDate,
  formatBookingStatus,
  calculateSavingsAmount,
} from '../typeSafeFormatters';
import { BookingStatus } from '@/types';

describe('typeSafeFormatters utilities', () => {
  describe('toNumber', () => {
    it('parses currency-formatted strings with thousand separators and comma decimals', () => {
      expect(toNumber('R$ 1.234,56')).toBeCloseTo(1234.56, 2);
      expect(toNumber('1.234,56')).toBeCloseTo(1234.56, 2);
    });

    it('returns 0 for invalid strings and null/undefined', () => {
      expect(toNumber('abc')).toBe(0);
      expect(toNumber(null)).toBe(0);
      expect(toNumber(undefined)).toBe(0);
    });
  });

  describe('formatPrice', () => {
    it('formats numbers to BRL currency string', () => {
      const s = formatPrice(1234.56);
      // Robust to locales inserting a space or non-breaking space
      expect(s).toMatch(/R\$\s?1\.234,56/);
    });
  });

  describe('formatDate', () => {
    it('returns empty string for null/undefined/invalid dates', () => {
            expect(formatDate(null as unknown as Date)).toBe('');
            expect(formatDate(undefined as unknown as Date)).toBe('');
      expect(formatDate('invalid-date')).toBe('');
    });

    it('formats valid Date objects consistently (local timezone)', () => {
      const d = new Date(2024, 0, 5, 10, 20, 0); // Jan 5, 2024 10:20 local
      expect(formatDate(d)).toMatch(/05\/01\/2024/);
    });
  });

  describe('formatBookingStatus', () => {
    it('maps enum BookingStatus to human-friendly labels', () => {
      expect(formatBookingStatus(BookingStatus.CONFIRMED)).toBe('Confirmado');
      expect(formatBookingStatus(BookingStatus.CANCELLED)).toBe('Cancelado');
    });
  });

  describe('calculateSavingsAmount', () => {
    it('returns difference when original is greater than current, otherwise 0', () => {
      expect(calculateSavingsAmount('1.000,00', '750,00')).toBeCloseTo(250, 5);
      expect(calculateSavingsAmount(500, 500)).toBe(0);
      expect(calculateSavingsAmount(400, 500)).toBe(0);
    });
  });
});
