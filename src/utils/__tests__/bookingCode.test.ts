import { describe, it, expect } from 'vitest';
import { formatBookingCode } from '../bookingCode';
import { buildQuoteMessage } from '../whatsapp';

// Achado: o código da reserva era cortado em 8 caracteres em todo lugar — "XP-ANA-2" na mensagem
// de orçamento, na confirmação por WhatsApp, no PDF da proposta e no roteiro do colaborador.
describe('formatBookingCode', () => {
  it('mostra o id legível inteiro e abrevia ids antigos', () => {
    expect(formatBookingCode('XP-ANA-20261120-1900-K4Q')).toBe('XP-ANA-20261120-1900-K4Q');
    expect(formatBookingCode('cm3x9k2ab0001qwe')).toBe('cm3x9k2a');
    expect(formatBookingCode(undefined)).toBe('');
  });

  it('a mensagem de orçamento leva o número completo do pedido', () => {
    const message = buildQuoteMessage({
      bookingId: 'XP-ANA-20261120-1900-K4Q',
      venue: 'Salão',
      eventDate: new Date('2026-11-20T22:00:00Z'),
      durationHours: 4,
      address: {},
      items: [],
      logistics: {},
    });
    expect(message).toContain('*Nº do Pedido:* XP-ANA-20261120-1900-K4Q');
  });
});
