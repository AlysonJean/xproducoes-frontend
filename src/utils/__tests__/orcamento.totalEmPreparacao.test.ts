import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { pdfText, autoTable } = vi.hoisted(() => ({ pdfText: vi.fn(), autoTable: vi.fn() }));
vi.mock('jspdf-autotable', () => ({ default: autoTable }));
vi.mock('jspdf', () => ({
  jsPDF: class {
    text = pdfText;
    save = vi.fn();
    splitTextToSize = (texto: string) => [texto];
    addImage() {}
    setFontSize() {}
  },
}));

import { generateBookingProposalPdf } from '../generateBookingProposalPdf';
import { BOOKING_TOTAL_PENDING, formatBookingTotal, formatPrice, hasBookingTotal } from '../formatPrice';
import type { BookingDetails } from '../../types/types';

// Auditoria do orçamento (12/11/2026), O3, A6, B9 e D2: o pedido ainda sem valor (o do briefing chega sem itens) só
// aparecia "Em preparação" na área do cliente; o PDF do cliente, o do painel, a ficha, a lista e a agenda mostravam
// "R$ 0,00". Uma regra só (hasBookingTotal), a mesma de formatBookingTotal e a do servidor (centavos inteiros: 0,004
// sairia "R$ 0,00").
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

const escritos = () => pdfText.mock.calls.map((c) => c[0]);

describe('generateBookingProposalPdf — total zero sai "Em preparação" (O3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pedido do briefing, sem itens nem valor: "Total: Em preparação", sem "R$ 0,00"', async () => {
    await generateBookingProposalPdf({ id: 'XP-ANA-1', eventDate: '2027-01-10T21:00:00.000Z', totalPrice: '0.00', clientName: 'Ana' } as BookingDetails);

    expect(escritos()).toContain('Total: Em preparação');
    expect(escritos().join(' ')).not.toContain(formatPrice(0));
  });

  it('com valor, o Total segue o da reserva', async () => {
    await generateBookingProposalPdf({ id: 'XP-ANA-2', eventDate: '2027-01-10T21:00:00.000Z', totalPrice: '900.00', clientName: 'Ana' } as BookingDetails);

    expect(escritos()).toContain(`Total: ${formatPrice(900)}`);
  });
});
