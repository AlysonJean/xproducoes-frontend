import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// O fuso do processo vai para Tóquio ANTES de importar o gerador (vi.hoisted roda antes dos imports): um formatador
// sem fuso explícito guarda o fuso do momento em que foi montado. Volta ao fuso original no fim do arquivo.
const { ORIGINAL_TZ } = vi.hoisted(() => {
  const original = process.env.TZ;
  process.env.TZ = 'Asia/Tokyo';
  return { ORIGINAL_TZ: original };
});

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
import type { BookingDetails } from '../../types/types';
import type { ProposalSummaryView } from '../bookingStatus';

// Auditoria do orçamento (12/11/2026): o PDF da área do cliente não dizia a validade da proposta (o link, o e-mail e o
// WhatsApp dizem), não tinha a duração e escrevia início e término no fuso do aparelho (O10/C5/D5, D11, D13); o frete a
// combinar saía "R$ 0,00" (O21). A validade é a do resumo da proposta que a API manda (proposal.validUntil). O fuso de
// Tóquio vem do vi.hoisted acima.
afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

type Reserva = BookingDetails & { proposal?: (ProposalSummaryView & { sentAt: string | null }) | null; validUntil?: string | null };
const enviada = (validUntil: string, expired = false) => ({
  sentAt: '2026-11-12T15:00:00.000Z', validUntil, expired, sentTotal: 400, changedSinceSent: false,
});
const RESERVA: Reserva = {
  id: 'XP-ANA-1', status: 'PENDING', eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T01:30:00.000Z',
  eventDuration: 4, totalPrice: '400.00', clientName: 'Ana Souza', proposal: enviada('2099-01-05T02:59:59.999Z'),
  pricing: {
    lines: [
      { description: 'Caixa ativa (1 diária)', quantity: 1, unitPrice: 400, discount: 0, total: 400, type: 'EQUIPMENT', equipmentId: 'eq1', serviceId: null, kitId: null },
      { description: 'Frete a combinar', quantity: 1, unitPrice: 0, discount: 0, total: 0, type: 'CUSTOM', equipmentId: null, serviceId: null, kitId: null, toArrange: 'freight' },
    ],
    itemsSubtotal: 400,
    couponDiscount: null,
    adjustment: 0,
    total: 400,
  },
};

const escritos = () => pdfText.mock.calls.map((c) => String(c[0]));

describe('generateBookingProposalPdf — validade real, duração pelas datas e horário de Brasília', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('início e término em Brasília, a duração das datas (não o eventDuration) e a validade da proposta enviada', async () => {
    await generateBookingProposalPdf(RESERVA);

    expect(escritos()).toContain('Início: 10/01/2027 18:00');
    expect(escritos()).toContain('Término: 10/01/2027 22:30');
    expect(escritos()).toContain('Duração: 4 h 30 min');
    expect(escritos()).toContain('Proposta válida até 04/01/2099.');
    expect(escritos().find((t) => t.startsWith('Gerada em: '))).toMatch(/^Gerada em: \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });

  it('proposta vencida pede uma nova; confirmada, sem envio ou só com a validUntil gravada não fala de validade', async () => {
    await generateBookingProposalPdf({ ...RESERVA, proposal: enviada('2020-03-02T02:59:59.999Z', true) });
    expect(escritos()).toContain('A validade da proposta acabou em 01/03/2020. Fale com a equipe para receber uma nova.');

    vi.clearAllMocks();
    await generateBookingProposalPdf({ ...RESERVA, status: 'CONFIRMED' });
    await generateBookingProposalPdf({ ...RESERVA, proposal: { sentAt: null } });
    const soValidUntil: Reserva = { ...RESERVA, proposal: null, validUntil: '2099-01-05T02:59:59.999Z' };
    await generateBookingProposalPdf(soValidUntil);
    expect(escritos().some((t) => /válida|validade|Validade/.test(t))).toBe(false);
  });

  // O21: frete que o servidor não calculou não é "R$ 0,00", e o total diz que não o inclui.
  it('frete a combinar sai "a combinar", não "R$ 0,00", com a frase de que o total não o inclui', async () => {
    await generateBookingProposalPdf(RESERVA);

    expect(autoTable.mock.calls[0][1].body).toEqual([
      ['Caixa ativa (1 diária)', 'Equipamento', expect.stringMatching(/400,00/)],
      ['Frete a combinar', 'Adicional', 'a combinar'],
    ]);
    expect(escritos()).toContain('O frete ainda vai ser combinado com a equipe e não está no total.');
  });
});
