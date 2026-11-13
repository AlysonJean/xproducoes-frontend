import { describe, it, expect } from 'vitest';
import { BOOKING_TOTAL_PENDING, formatBookingTotal, formatPrice, hasBookingTotal } from '../formatPrice';

// Auditoria do orçamento (12/11/2026), O3, A6, B9 e D2: o pedido ainda sem valor (o do briefing chega sem itens) só
// aparecia "Em preparação" na área do cliente; o PDF do cliente, o do painel, a ficha, a lista e a agenda mostravam
// "R$ 0,00". Uma regra só (hasBookingTotal), a mesma de formatBookingTotal e a do servidor (centavos inteiros: 0,004
// sairia "R$ 0,00"). Orçamento em PDF (13/11/2026): o PDF agora é gerado pelo servidor, que escreve "Em preparação"
// no total zero (backend/src/services/pdf/__tests__); o PDF montado no navegador saiu.
describe('hasBookingTotal — a regra só do valor da reserva', () => {
  it.each([[null], [undefined], [0], ['0'], ['0.00'], [0.004], ['0.004'], ['abc'], [-10], [Number.NaN]])('%s: sem valor', (valor) => {
    expect(hasBookingTotal(valor as never)).toBe(false);
    expect(formatBookingTotal(valor as never)).toBe(BOOKING_TOTAL_PENDING);
  });

  it.each([[0.01], ['1350.00'], [300]])('%s: com valor', (valor) => {
    expect(hasBookingTotal(valor)).toBe(true);
    expect(formatBookingTotal(valor)).toBe(formatPrice(valor));
  });

  it('o texto é "Em preparação"', () => {
    expect(BOOKING_TOTAL_PENDING).toBe('Em preparação');
  });
});
