import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Onda 2 da auditoria do status da reserva (decisões de Alyson de 21/11/2026), do lado do cliente e no painel:
// - M3: a reserva cancelada pela equipe com o contrato aceito: o cartão do contrato diz "Encerrado" e tira os vencimentos;
// - D6: "reserva confirmada" e "sinal recebido" são coisas diferentes na confirmação do aceite;
// - C5: o cartão de pendências do painel conta os contratos aceitos que esperam o sinal (e os vencidos).
const { contractAPI } = vi.hoisted(() => ({ contractAPI: { forClient: vi.fn(), downloadForClient: vi.fn(), withdrawForClient: vi.fn() } }));
vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return { ...actual, contractAPI };
});

vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));

import { ClientContractCard } from '../ClientContractCard';
import { ContractConfirmation } from '../ContractConfirmation';
import { PendingRequestsCard } from '../../admin/PendingRequestsCard';

const contrato = {
  state: 'ACCEPTED', acceptedAt: '2026-11-17T20:00:00.000Z', sha256: 'abc', withdrawUntil: null, canWithdraw: false,
  initialPayment: { amount: 450, dueDate: '2026-11-20T02:59:59.000Z' }, balance: { amount: 450, dueDate: '2026-12-19T01:00:00.000Z' },
  protocol: 'CT-20261117-ABCDEF', pix: { key: '55343824000156', keyType: 'CNPJ', copyPaste: '000201...' }, initialPaymentReceived: false,
};
const summary = { state: 'ACCEPTED' as const, acceptedAt: '2026-11-17T20:00:00.000Z', withdrawUntil: null, partyName: 'Ana Souza' };

describe('cliente e painel — onda 2 da auditoria do status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contractAPI.forClient.mockResolvedValue(contrato);
  });

  it('M3: reserva cancelada com o contrato aceito: "Encerrado", sem vencimentos nem PIX', async () => {
    render(<ClientContractCard bookingId="XP-1" summary={summary} bookingStatus="CANCELLED" onChanged={vi.fn()} />);

    expect(await screen.findByText('Encerrado')).toBeInTheDocument();
    expect(screen.getByText('A reserva foi cancelada. Os pagamentos combinados com a equipe seguem o contrato.')).toBeInTheDocument();
    await screen.findByText('CT-20261117-ABCDEF');
    expect(screen.queryByText('Parcela inicial (PIX)')).not.toBeInTheDocument();
    expect(screen.queryByText('Pagar a parcela inicial por PIX')).not.toBeInTheDocument();
  });

  it('M3: reserva em aberto: o cartão segue "Aceito" com os vencimentos e o PIX', async () => {
    render(<ClientContractCard bookingId="XP-1" summary={summary} bookingStatus="PENDING" onChanged={vi.fn()} />);

    expect(await screen.findByText('Parcela inicial (PIX)')).toBeInTheDocument();
    expect(screen.queryByText('Encerrado')).not.toBeInTheDocument();
    expect(screen.getByText('Pagar a parcela inicial por PIX')).toBeInTheDocument();
  });

  it('D6: confirmada sem o sinal registrado: "A equipe já confirmou a reserva", não "parcela recebida"', () => {
    render(
      <ContractConfirmation
        token="t"
        onWithdrawn={vi.fn()}
        data={{ acceptedAt: '2026-11-17T20:00:00.000Z', protocol: 'CT-1', initialPaymentReceived: false, bookingConfirmed: true, withdrawUntil: null, canWithdraw: false }}
      />,
    );

    expect(screen.getByText('A equipe já confirmou a reserva. Se você já pagou a parcela inicial, envie o comprovante abaixo.')).toBeInTheDocument();
    expect(screen.queryByText(/Parcela inicial recebida/)).not.toBeInTheDocument();
  });

  it('C5: o cartão de pendências conta os contratos aceitos que esperam o sinal e os vencidos', () => {
    render(
      <MemoryRouter>
        <PendingRequestsCard
          summary={{ waitingRequests: 0, oldestWaitingAt: null, pastEventRequests: 0, proposalsAwaitingClient: 0, unreadContacts: 0, acceptedAwaitingPayment: 2, overdueInitialPayments: 1 }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: '2 contratos aceitos aguardando o sinal, 1 com o sinal vencido' });
    expect(link).toHaveAttribute('href', '/admin/reservas?contrato=aceito-sem-sinal&periodo=proximos&ordem=antigos');
  });
});
