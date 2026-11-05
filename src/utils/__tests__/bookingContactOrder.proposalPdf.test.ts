import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { pdfText, save } = vi.hoisted(() => ({ pdfText: vi.fn(), save: vi.fn() }));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
// O PDF de verdade não importa aqui: só o que ele escreve na seção do cliente.
vi.mock('jspdf', () => ({
  jsPDF: class {
    text = pdfText;
    save = save;
    splitTextToSize = (texto: string) => [texto];
    addImage() {}
    setFontSize() {}
  },
}));

import { generateBookingProposalPdf } from '../generateBookingProposalPdf';
import type { BookingDetails } from '../../types/types';

// Achado (auditoria ponta a ponta): o PDF da proposta da área do cliente (Minhas Reservas > detalhes >
// "Baixar proposta (PDF)") punha o telefone e o e-mail do cadastro antes dos informados na reserva, o
// contrário do servidor e do PDF do painel. Na reserva que a Proposta Rápida pendurou no cadastro de
// cliente do próprio admin (antes de 89ef066), saía o telefone de OUTRO cliente.
const reservaNoCadastroDoAdmin: BookingDetails = {
  id: 'XP-ANA-20270110', eventDate: '2027-01-10T21:00:00.000Z', totalPrice: '300',
  client: { id: 'cli-admin', phone: '31911112222', user: { id: 'a1', name: 'Dono da Empresa', email: 'dono@empresa.test' } },
  clientName: 'Ana Souza', clientContact: '(31) 98888-7777', clientEmail: 'ana@cliente.test',
};

const escritos = () => pdfText.mock.calls.map((c) => c[0]);

describe('generateBookingProposalPdf — contato da reserva antes do cadastro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('usa o telefone e o e-mail informados na reserva, não os do cadastro', async () => {
    await generateBookingProposalPdf(reservaNoCadastroDoAdmin);

    expect(escritos()).toContain('WhatsApp: (31) 98888-7777');
    expect(escritos()).toContain('Email: ana@cliente.test');
    expect(escritos()).not.toContain('WhatsApp: 31911112222');
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('contato que é e-mail (orçamento do site sem telefone): WhatsApp do cadastro', async () => {
    await generateBookingProposalPdf({ ...reservaNoCadastroDoAdmin, clientContact: 'ana@cliente.test' });

    expect(escritos()).toContain('WhatsApp: 31911112222');
  });

  it('reserva sem e-mail próprio: e-mail da conta do cliente', async () => {
    await generateBookingProposalPdf({ ...reservaNoCadastroDoAdmin, clientEmail: undefined });

    expect(escritos()).toContain('Email: dono@empresa.test');
  });
});
