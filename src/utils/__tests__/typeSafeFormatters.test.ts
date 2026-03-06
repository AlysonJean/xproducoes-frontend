import { describe, it, expect } from 'vitest';
import {
  toNumber,
  formatPrice,
  formatDate,
  formatDateTime,
  formatBookingStatus,
  sanitizeEmail,
  calculatePeriodDiscount,
  calculateSavingsAmount,
  safeTransformEquipment,
  validateKit,
  daysDifference,
} from '../typeSafeFormatters';
import { BookingStatus, EquipmentStatus, type Equipment, type Kit } from '@/types';

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

  describe('formatDate and formatDateTime', () => {
    it('returns empty string for null/undefined/invalid dates', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(formatDate(null as any)).toBe('');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(formatDateTime(undefined as any)).toBe('');
      expect(formatDate('invalid-date')).toBe('');
    });

    it('formats valid Date objects consistently (local timezone)', () => {
      const d = new Date(2024, 0, 5, 10, 20, 0); // Jan 5, 2024 10:20 local
      const ds = formatDate(d);
      const dts = formatDateTime(d);
      expect(ds).toMatch(/05\/01\/2024/);
      expect(dts).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(dts).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('formatBookingStatus', () => {
    it('maps enum BookingStatus to human-friendly labels', () => {
      expect(formatBookingStatus(BookingStatus.CONFIRMED)).toBe('Confirmado');
      expect(formatBookingStatus(BookingStatus.CANCELLED)).toBe('Cancelado');
    });
  });

  describe('sanitizeEmail', () => {
    it('trims and lowercases email safely', () => {
      const input = '  João.Silva@Email.COM  ';
      const result = sanitizeEmail(input);
      expect(result).toBe('joão.silva@email.com');
    });
  });

  describe('calculatePeriodDiscount', () => {
    it('applies progressive discounts (>=7d => 10%)', () => {
      const { total, discount, originalTotal } = calculatePeriodDiscount(100, 10);
      expect(originalTotal).toBe(1000);
      expect(discount).toBeCloseTo(100, 5);
      expect(total).toBeCloseTo(900, 5);
    });

    it('applies 20% for >=30 days and 5% for >=3 days', () => {
      const m = calculatePeriodDiscount(50, 30);
      expect(m.originalTotal).toBe(1500);
      expect(m.discount).toBeCloseTo(300, 5);
      expect(m.total).toBeCloseTo(1200, 5);

      const w = calculatePeriodDiscount(200, 3);
      expect(w.originalTotal).toBe(600);
      expect(w.discount).toBeCloseTo(30, 5);
      expect(w.total).toBeCloseTo(570, 5);
    });
  });

  describe('calculateSavingsAmount', () => {
    it('returns difference when original is greater than current, otherwise 0', () => {
      expect(calculateSavingsAmount('1.000,00', '750,00')).toBeCloseTo(250, 5);
      expect(calculateSavingsAmount(500, 500)).toBe(0);
      expect(calculateSavingsAmount(400, 500)).toBe(0);
    });
  });

  describe('safeTransformEquipment', () => {
    it('safely applies defaults and parses numeric fields', () => {
      const input: Partial<Equipment> = {
        id: 'eq1',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name: undefined as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dailyPrice: '199,90' as any,
        status: undefined,
      };
      const eq = safeTransformEquipment(input);
      expect(eq.id).toBe('eq1');
      expect(eq.name).toBe('');
      expect(eq.dailyPrice).toBeCloseTo(199.90, 2);
      expect(eq.status).toBe(EquipmentStatus.AVAILABLE);
      expect(Array.isArray(eq.images)).toBe(true);
    });
  });

  describe('validateKit', () => {
    it('validates required fields: name, positive price, non-empty equipments', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invalid1: Partial<Kit> = { name: 'Kit', price: 0, equipments: [] as any };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invalid2: Partial<Kit> = { name: 'Kit', price: 'abc' as any, equipments: [] as any };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invalid3: Partial<Kit> = { name: '', price: 100, equipments: [{ id: 'e1', name: 'E', equipments: [] } as any] };

      expect(validateKit(invalid1)).toBe(false);
      expect(validateKit(invalid2)).toBe(false);
      expect(validateKit(invalid3)).toBe(false);

      const valid: Partial<Kit> = {
        name: 'Bundle',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        price: '1.000,00' as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        equipments: [{ id: 'e1', name: 'E1' } as any],
      };
      expect(validateKit(valid)).toBe(true);
    });
  });

  describe('daysDifference', () => {
    it('computes absolute day difference', () => {
      expect(daysDifference('2024-01-01', '2024-01-10')).toBe(9);
      // reversed should still yield positive difference
      expect(daysDifference('2024-01-10', '2024-01-01')).toBe(9);
    });
  });
});
