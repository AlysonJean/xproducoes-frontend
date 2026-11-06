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
import { formatPrice } from '../formatPrice';
import type { BookingDetails } from '../../types/types';

// D8a e P16 (aprovadas em 02/11/2026): o PDF da área do cliente listava os preços de HOJE do catálogo (kit
// pelo preço cheio, equipamento "por hora") e o total não batia com as linhas. Agora as linhas e o total
// são os da reserva (pricing da API), os mesmos da página do cliente e do PDF do painel.
const RESERVA: BookingDetails = {
  id: 'XP-ANA-1', eventDate: '2027-01-10T21:00:00.000Z', totalPrice: '1350.00', clientName: 'Ana Souza',
  kit: { id: 'kit1', name: 'Kit Festa', price: 120 } as BookingDetails['kit'],
  pricing: {
    lines: [
      { description: 'Kit Festa (5 h)', quantity: 1, unitPrice: 1200, discount: 0, total: 1200, type: 'KIT', equipmentId: null, serviceId: null, kitId: 'kit1' },
      { description: 'Técnico', quantity: 1, unitPrice: 300, discount: 0, total: 300, type: 'CUSTOM', equipmentId: null, serviceId: null, kitId: null },
      { description: 'Frete (dentro de BH)', quantity: 1, unitPrice: 0, discount: 0, total: 0, type: 'CUSTOM', equipmentId: null, serviceId: null, kitId: null },
    ],
    itemsSubtotal: 1500,
    couponDiscount: { amount: 150, code: 'PROMO' },
    adjustment: 0,
    total: 1350,
  },
};

const escritos = () => pdfText.mock.calls.map((c) => c[0]);
const linhas = () => autoTable.mock.calls[0][1].body as string[][];

describe('generateBookingProposalPdf — linhas e total da reserva (D8a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('as linhas gravadas (técnico e frete de BH inclusive) e o Total da API, não o preço do catálogo', async () => {
    await generateBookingProposalPdf(RESERVA);

    expect(linhas()).toEqual([
      ['Kit Festa (5 h)', 'Kit', formatPrice(1200)],
      ['Técnico', 'Adicional', formatPrice(300)],
      ['Frete (dentro de BH)', 'Adicional', formatPrice(0)],
    ]);
    expect(escritos()).toContain(`Subtotal: ${formatPrice(1500)}`);
    expect(escritos()).toContain(`Desconto (PROMO): - ${formatPrice(150)}`);
    expect(escritos()).toContain(`Total: ${formatPrice(1350)}`);
    expect(escritos().join(' ')).not.toContain(formatPrice(120));
  });

  it('reserva antiga sem itens gravados: só os nomes, e o Total é o valor final', async () => {
    await generateBookingProposalPdf({ ...RESERVA, pricing: undefined, totalPrice: '900.00' });

    expect(linhas()).toEqual([['Kit Festa', 'Kit', 'Incluído no total']]);
    expect(escritos()).toContain(`Total: ${formatPrice(900)}`);
  });
});
