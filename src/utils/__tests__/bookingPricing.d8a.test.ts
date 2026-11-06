import { describe, it, expect } from 'vitest';
import {
  bookingPricing,
  equipmentUnits,
  equipmentUnitSuffix,
  equipmentUnitText,
  hoursBetween,
  type BookingPricing,
  type PricedBookingLike,
} from '../bookingPricing';

// D8a e P16 (aprovadas em 02/11/2026): um valor final só por reserva (o totalPrice) e a conta do servidor
// (backend/src/services/booking/bookingPricing.ts). O site lê o `pricing` da API e, quando a resposta não o
// traz, faz a mesma conta. Mesmo vetor de casos do teste do backend (src/utils/__tests__/
// d8a.p16.valorFinalUnico.test.ts): as duas contas têm de dar o mesmo resultado para a mesma reserva.
const VETOR: Array<{ nome: string; booking: Record<string, unknown>; esperado: { total: number; itemsSubtotal: number; cupom: number; ajuste: number; linhas: number } }> = [
  {
    nome: 'itens e cupom',
    booking: {
      totalPrice: '1350.00', discountAmount: '150.00', coupon: { code: 'PROMO' },
      items: [
        { description: 'Kit Festa (6 h)', quantity: 1, unitPrice: '1200.00', discount: '0', totalPrice: '1200.00', itemType: 'KIT' },
        { description: 'Técnico', quantity: 1, unitPrice: '300.00', discount: null, totalPrice: '300.00', itemType: 'CUSTOM' },
      ],
    },
    esperado: { total: 1350, itemsSubtotal: 1500, cupom: 150, ajuste: 0, linhas: 2 },
  },
  {
    nome: 'valor final acima dos itens: ajuste positivo',
    booking: { totalPrice: 2000, items: [{ description: 'Som', quantity: 1, unitPrice: 1500, totalPrice: 1500, itemType: 'CUSTOM' }] },
    esperado: { total: 2000, itemsSubtotal: 1500, cupom: 0, ajuste: 500, linhas: 1 },
  },
  {
    nome: 'valor final abaixo dos itens: ajuste negativo',
    booking: { totalPrice: '1200.00', items: [{ description: 'Som', quantity: 2, unitPrice: '750.00', totalPrice: '1500.00', itemType: 'EQUIPMENT' }] },
    esperado: { total: 1200, itemsSubtotal: 1500, cupom: 0, ajuste: -300, linhas: 1 },
  },
  {
    nome: 'reserva antiga sem itens gravados: só o total, sem linhas inventadas',
    booking: { totalPrice: '800.00', items: [] },
    esperado: { total: 800, itemsSubtotal: 0, cupom: 0, ajuste: 0, linhas: 0 },
  },
  {
    nome: 'serviceValue nunca soma: o total é o totalPrice',
    booking: { totalPrice: '1500.00', serviceValue: '1500.00' },
    esperado: { total: 1500, itemsSubtotal: 0, cupom: 0, ajuste: 0, linhas: 0 },
  },
  {
    nome: 'centavos exatos',
    booking: { totalPrice: 0.3, items: [{ description: 'A', totalPrice: 0.1 }, { description: 'B', totalPrice: 0.2 }] },
    esperado: { total: 0.3, itemsSubtotal: 0.3, cupom: 0, ajuste: 0, linhas: 2 },
  },
];

describe('bookingPricing (site) — a mesma conta do servidor', () => {
  it.each(VETOR)('$nome', ({ booking, esperado }) => {
    const p = bookingPricing(booking as unknown as PricedBookingLike);
    expect({ total: p.total, itemsSubtotal: p.itemsSubtotal, cupom: p.couponDiscount?.amount ?? 0, ajuste: p.adjustment, linhas: p.lines.length }).toEqual(esperado);
  });

  it('usa o resumo que a API mandou, sem refazer a conta', () => {
    const pricing: BookingPricing = { lines: [], itemsSubtotal: 0, couponDiscount: null, adjustment: 0, total: 999 };
    expect(bookingPricing({ totalPrice: '100.00', pricing })).toBe(pricing);
  });

  it('horas do evento pelas datas (para cima, no mínimo 1); sem as duas datas, nenhuma', () => {
    expect(hoursBetween('2027-01-10T18:00', '2027-01-10T23:00')).toBe(5);
    expect(hoursBetween('2027-01-10T18:00', '2027-01-10T23:20')).toBe(6);
    expect(hoursBetween('2027-01-10T18:00', '')).toBeNull();
    expect(hoursBetween('2027-01-10T18:00', '2027-01-10T17:00')).toBeNull();
  });

  // Decisões do dono de 06/11: equipamento por hora (padrão) ou por diária, conforme EQUIPMENT_PRICE_UNIT.
  it('unidades do equipamento: horas, ou diárias de 24 h para cima (no mínimo 1 e no mínimo o do cadastro)', () => {
    expect(equipmentUnits('hour', '2027-01-10T18:00', '2027-01-10T23:00')).toBe(5);
    expect(equipmentUnits('day', '2027-01-10T18:00', '2027-01-10T23:00')).toBe(1);
    expect(equipmentUnits('day', '2027-01-10T18:00', '2027-01-12T02:00')).toBe(2);
    expect(equipmentUnits('day', '2027-01-10T18:00', '2027-01-10T23:00', 3)).toBe(3);
    expect(equipmentUnits('day', '2027-01-10T18:00', '')).toBeNull();
    expect(equipmentUnitText(1, 'day')).toBe('1 diária');
    expect(equipmentUnitText(2, 'day')).toBe('2 diárias');
    expect(equipmentUnitText(5, 'hour')).toBe('5 h');
    expect(equipmentUnitSuffix('day')).toBe('/diária');
    expect(equipmentUnitSuffix('hour')).toBe('/h');
  });
});
