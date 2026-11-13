import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

// Auditoria do orçamento (12/11/2026), O2/C2 (decisão da dona de 12/11: o link mostra sempre a reserva atual): o
// cartão Histórico da ficha mostra, em cada envio da proposta, o valor enviado, a validade e os itens enviados (frete a
// combinar como "a combinar", O21/D9), e o envio mais recente avisa quando a reserva mudou depois dele. Antes o
// registro não guardava valor nem linhas.
const { bookingAPI } = vi.hoisted(() => ({ bookingAPI: { getAuditHistory: vi.fn() } }));
vi.mock('@/services/api', () => ({ bookingAPI }));

import { ProposalHistory } from '../ProposalHistory';

const montar = async (entries: unknown[]) => {
  bookingAPI.getAuditHistory.mockResolvedValue({ data: entries });
  render(<ul><ProposalHistory bookingId="XP-ANA-1" refreshKey={0} /></ul>);
  await screen.findAllByText(/Proposta enviada|Link da proposta/);
};

beforeEach(() => vi.clearAllMocks());

describe('ProposalHistory — o que foi enviado (O2/C2)', () => {
  it('valor enviado, validade e itens enviados; o envio mais recente avisa que a reserva mudou depois dele', async () => {
    await montar([
      {
        action: 'PROPOSAL_SENT', timestamp: '2027-12-09T13:30:00.000Z', actorName: 'Dono da Empresa',
        details: {
          emailStatus: 'queued', rotated: false, validUntil: '2027-12-16T02:59:59.999Z', total: 900, changedSince: true,
          lines: [
            { description: 'Kit Som (4 h incluídas)', quantity: 1, total: 900 },
            { description: 'Frete a combinar', quantity: 1, total: 0, toArrange: 'freight' },
            { description: 'Caixa extra', quantity: 2, total: 80 },
          ],
        },
      },
      { action: 'PROPOSAL_LINK_ISSUED', timestamp: '2027-12-09T13:30:00.000Z', actorName: 'Dono da Empresa', details: {} },
      // Envio de antes de 13/11/2026: sem valor guardado.
      { action: 'PROPOSAL_SENT', timestamp: '2027-12-08T13:30:00.000Z', actorName: 'Dono da Empresa', details: { emailStatus: 'skipped_no_email', rotated: false } },
    ]);

    expect(screen.getByText(/^Valor enviado: R\$\s900,00 · válida até 15\/12\/2027$/)).toBeInTheDocument();
    expect(screen.getAllByText(/Valor enviado/)).toHaveLength(1);
    const itens = screen.getByRole('list', { name: 'Itens enviados' });
    expect(within(itens).getByText('a combinar')).toBeInTheDocument();
    expect(within(itens).getByText('2× Caixa extra')).toBeInTheDocument();
    expect(within(itens).queryByText(/R\$\s0,00/)).toBeNull();
    expect(screen.getAllByText('A reserva mudou depois deste envio — reenvie a proposta.')).toHaveLength(1);
    // O texto de antes de cada envio continua igual.
    expect(screen.getByText('Proposta enviada por e-mail')).toBeInTheDocument();
    expect(screen.getByText('09/12/2027 às 10:30 · por Dono da Empresa')).toBeInTheDocument();
    expect(screen.getByText('Link da proposta gerado (a reserva não tem e-mail)')).toBeInTheDocument();
  });

  it('com cupom e ajuste, os itens enviados trazem o desconto e o ajuste (a conta fecha com o valor enviado)', async () => {
    await montar([
      {
        action: 'PROPOSAL_SENT', timestamp: '2027-12-09T13:30:00.000Z', actorName: null,
        details: {
          emailStatus: 'queued', total: 870, discount: 50, adjustment: 20,
          lines: [{ description: 'Kit Som (4 h incluídas)', quantity: 1, total: 900 }],
        },
      },
    ]);

    const itens = screen.getByRole('list', { name: 'Itens enviados' });
    expect(within(itens).getByText('Desconto')).toBeInTheDocument();
    expect(within(itens).getByText(/^−\sR\$\s50,00$/)).toBeInTheDocument();
    expect(within(itens).getByText('Ajuste no valor final')).toBeInTheDocument();
    expect(within(itens).getByText(/^\+\sR\$\s20,00$/)).toBeInTheDocument();
  });

  it('sem mudança depois do envio (changedSince false): nenhum aviso', async () => {
    await montar([
      { action: 'PROPOSAL_SENT', timestamp: '2027-12-09T13:30:00.000Z', actorName: null, details: { emailStatus: 'queued', total: 900, lines: [], changedSince: false } },
    ]);

    expect(screen.getByText(/^Valor enviado: R\$\s900,00$/)).toBeInTheDocument();
    expect(screen.queryByText(/A reserva mudou/)).toBeNull();
    expect(screen.queryByRole('list', { name: 'Itens enviados' })).toBeNull();
  });
});
