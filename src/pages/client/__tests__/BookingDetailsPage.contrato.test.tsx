import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Aceite online (13/11/2026): com contractSummary no GET /bookings/:id, a área do cliente mostra o cartão "Contrato"
// (GET /bookings/:id/contract): estado, data do aceite, vencimentos, impressão digital, "Baixar contrato (PDF)" e,
// dentro do prazo de 7 dias do cliente final, "Desistir da contratação" (POST /bookings/:id/contract/withdraw), com
// confirmação no modal do design system. Sem contrato, nada muda.
const { apiFetch, quotePdfAPI, contractAPI, addNotification } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  quotePdfAPI: { forClient: vi.fn() },
  contractAPI: { forClient: vi.fn(), downloadForClient: vi.fn(), withdrawForClient: vi.fn() },
  addNotification: vi.fn(),
}));
vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return { apiFetch, quotePdfAPI, contractAPI, readApiError: actual.readApiError };
});
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'CLIENT' } }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../components/client/BookingChatPanel', () => ({ BookingChatPanel: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { BookingDetailsPage } from '../BookingDetailsPage';

const SHA = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
const RESERVA = { id: 'XP-ANA-1', status: 'PENDING', eventDate: '2027-12-21T01:00:00.000Z', totalPrice: '1800.00', attachments: [], eventCollaborators: [] };
const RESUMO = { state: 'ACCEPTED', acceptedAt: '2027-11-30T13:00:00.000Z', withdrawUntil: '2027-12-07T13:00:00.000Z', partyName: 'Ana Souza' };
const CONTRATO = {
  state: 'ACCEPTED',
  acceptedAt: '2027-11-30T13:00:00.000Z',
  sha256: SHA,
  withdrawUntil: '2027-12-07T13:00:00.000Z',
  canWithdraw: true,
  initialPayment: { amount: 900, dueDate: '2027-12-03T02:59:59.999Z' },
  balance: { amount: 900, dueDate: '2027-12-19T01:00:00.000Z' },
  protocol: 'CT-20271130-ABCD',
};

const renderPage = async (reserva: object) => {
  apiFetch.mockResolvedValue(reserva);
  const utils = render(
    <MemoryRouter initialEntries={['/cliente/reservas/XP-ANA-1']}>
      <Routes>
        <Route path="/cliente/reservas/:id" element={<BookingDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText('Resumo Financeiro');
  return utils;
};
const texto = () => (document.body.textContent ?? '').replace(/\s+/g, ' ');

describe('BookingDetailsPage (cliente) — cartão Contrato', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contractAPI.forClient.mockResolvedValue(CONTRATO);
  });

  it('contrato aceito: estado, aceito em, vencimentos, impressão digital e "Baixar contrato (PDF)"', async () => {
    contractAPI.downloadForClient.mockResolvedValue(undefined);
    await renderPage({ ...RESERVA, contractSummary: RESUMO });

    expect(await screen.findByRole('heading', { name: 'Contrato' })).toBeInTheDocument();
    await screen.findByText(SHA);
    expect(contractAPI.forClient).toHaveBeenCalledWith('XP-ANA-1');
    const page = texto();
    expect(page).toContain('Aceito');
    expect(page).toContain('Aceito em30/11/2027 às 10:00');
    // Do contratante, só o nome (contractSummary.partyName); o protocolo vem do GET /bookings/:id/contract.
    expect(page).toContain('ContratanteAna Souza');
    expect(page).toContain('ProtocoloCT-20271130-ABCD');
    expect(page).toContain('Parcela inicial (PIX)R$ 900,00 até 02/12/2027');
    expect(page).toContain('SaldoR$ 900,00 até 18/12/2027 às 22:00');
    expect(page).toContain('Você pode desistir até 07/12 às 10:00');

    fireEvent.click(screen.getByRole('button', { name: 'Baixar contrato (PDF)' }));
    await waitFor(() => expect(contractAPI.downloadForClient).toHaveBeenCalledWith('XP-ANA-1'));
  });

  it('"Desistir da contratação": confirma no modal, registra, avisa e recarrega a reserva', async () => {
    contractAPI.withdrawForClient.mockResolvedValue({ withdrawnAt: '2027-12-01T15:00:00.000Z' });
    await renderPage({ ...RESERVA, contractSummary: RESUMO });

    fireEvent.click(await screen.findByRole('button', { name: 'Desistir da contratação' }));
    const dialog = await screen.findByRole('dialog', { name: 'Desistir da contratação?' });
    expect(contractAPI.withdrawForClient).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Desistir' }));

    await waitFor(() => expect(contractAPI.withdrawForClient).toHaveBeenCalledWith('XP-ANA-1'));
    await waitFor(() =>
      expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Desistência registrada' })),
    );
    // A tela busca a reserva de novo (agora cancelada).
    await waitFor(() => expect(apiFetch.mock.calls.filter(([url]) => url === '/bookings/XP-ANA-1')).toHaveLength(2));
  });

  it('prazo encerrado no servidor (WITHDRAWAL_CLOSED): o aviso diz por quê', async () => {
    contractAPI.withdrawForClient.mockRejectedValue(
      Object.assign(new Error('O prazo de 7 dias para desistir já acabou. Para cancelar, fale com a equipe (vale a tabela de cancelamento).'), {
        status: 409,
        body: { code: 'WITHDRAWAL_CLOSED', reason: 'DEADLINE' },
      }),
    );
    await renderPage({ ...RESERVA, contractSummary: RESUMO });

    fireEvent.click(await screen.findByRole('button', { name: 'Desistir da contratação' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Desistir' }));

    await waitFor(() =>
      expect(addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', message: expect.stringContaining('O prazo de 7 dias para desistir já acabou.') }),
      ),
    );
  });

  it('fora do prazo (canWithdraw false): sem "Desistir"; desistido: "Contratação desistida em DD/MM"', async () => {
    contractAPI.forClient.mockResolvedValue({ ...CONTRATO, canWithdraw: false });
    const aceito = await renderPage({ ...RESERVA, contractSummary: RESUMO });
    await screen.findByText(SHA);
    expect(screen.queryByRole('button', { name: 'Desistir da contratação' })).not.toBeInTheDocument();
    aceito.unmount();

    contractAPI.forClient.mockResolvedValue({ ...CONTRATO, state: 'WITHDRAWN', canWithdraw: false, withdrawnAt: '2027-12-01T15:00:00.000Z' });
    await renderPage({ ...RESERVA, status: 'CANCELLED', contractSummary: { ...RESUMO, state: 'WITHDRAWN' } });
    expect(await screen.findByText('Contratação desistida em 01/12.')).toBeInTheDocument();
    expect(screen.getByText('Desistência registrada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desistir da contratação' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Baixar contrato (PDF)' })).toBeInTheDocument();
  });

  it('sem contrato (contractSummary null ou ausente): nenhum cartão e nenhuma chamada; os detalhes falham: estado do resumo e "Tentar de novo"', async () => {
    const semCampo = await renderPage(RESERVA);
    expect(screen.queryByRole('heading', { name: 'Contrato' })).not.toBeInTheDocument();
    semCampo.unmount();
    const nulo = await renderPage({ ...RESERVA, contractSummary: null });
    expect(screen.queryByRole('heading', { name: 'Contrato' })).not.toBeInTheDocument();
    expect(contractAPI.forClient).not.toHaveBeenCalled();
    nulo.unmount();

    contractAPI.forClient.mockRejectedValueOnce(Object.assign(new Error('falhou'), { status: 500 }));
    await renderPage({ ...RESERVA, contractSummary: RESUMO });
    expect(await screen.findByText('Não conseguimos carregar os detalhes do contrato.')).toBeInTheDocument();
    expect(texto()).toContain('Aceito em30/11/2027 às 10:00');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await screen.findByText(SHA);
    expect(contractAPI.forClient).toHaveBeenCalledTimes(2);
  });
});
