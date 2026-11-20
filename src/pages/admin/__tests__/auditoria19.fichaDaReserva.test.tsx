import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { bookingAPI, quotePdfAPI } = vi.hoisted(() => ({
  bookingAPI: {
    getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn(),
    sendProposal: vi.fn(), getAuditHistory: vi.fn(),
  },
  quotePdfAPI: { forAdmin: vi.fn() },
}));
vi.mock('../../../services/api', () => ({ bookingAPI, quotePdfAPI, api: { post: vi.fn(), delete: vi.fn() }, apiFetch: vi.fn().mockResolvedValue({}) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('@/hooks/useCollaborators', () => ({ useCollaborators: () => ({ collaborators: [], fetchCollaborators: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));
vi.mock('@/components/bookings/BookingCollaborators', () => ({ BookingCollaborators: () => null }));
vi.mock('@/components/bookings/BookingFinancialSummary', () => ({ BookingFinancialSummary: () => null }));
vi.mock('../../../components/modals/EventManagement', () => ({ EventManagement: () => null }));
// O cartão do contrato de verdade tem os testes dele (BookingDetailPage.contrato.test.tsx); aqui só importa o envio da proposta.
vi.mock('../../../components/proposal/AdminContractCard', () => ({ AdminContractCard: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import BookingDetailPage from '../BookingDetailPage';

// Pedido pendente, com telefone válido e a proposta já enviada (o painel mostra "Reenviar proposta" e "Gerar novo link").
const RESERVA = {
  id: 'XP-ANA-20271220', status: 'PENDING', deliveryStatus: 'PENDING', totalPrice: '1800.00',
  eventDate: '2027-12-21T01:00:00.000Z', eventEndDate: '2027-12-21T07:00:00.000Z', location: 'Espaço VIP',
  clientId: null, client: null, clientName: 'Ana Souza', clientContact: '31988887777', clientEmail: 'ana@cliente.test',
  attachments: [], equipments: [], services: [], eventCollaborators: [],
  proposal: { sentAt: '2027-11-29T15:00:00.000Z', validUntil: '2099-12-06T02:59:59.999Z', expired: false, sentTotal: 1800, changedSinceSent: false },
};
const contrato = (state: string) => ({ state, acceptedAt: state === 'PREPARED' ? null : '2027-11-30T13:00:00.000Z', withdrawUntil: null });
const NOTA = 'O cliente já respondeu o contrato: a proposta não é reenviada, e o link do contrato continua o mesmo (veja o cartão do contrato).';

const renderFicha = async (reserva: object) => {
  bookingAPI.getById.mockResolvedValue({ data: reserva });
  const view = render(
    <MemoryRouter initialEntries={['/admin/reservas/XP']}>
      <Routes><Route path="/admin/reservas/:id" element={<BookingDetailPage />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: /^Reserva / });
  return view;
};

describe('Ficha da reserva — auditoria completa (19/11/2026)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingAPI.getAuditHistory.mockResolvedValue({ data: [] });
    bookingAPI.updateStatus.mockResolvedValue({ data: {} });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sem rede')));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // O aceite não muda o status (a reserva segue pendente), e o "Reenviar"/"Gerar novo link" seguiam na ficha: o link novo
  // derrubava o link do contrato. O servidor agora recusa (409 PROPOSAL_CONTRACT_ACCEPTED) e a ficha tira o envio.
  it.each(['ACCEPTED', 'WITHDRAWN'])(
    'contrato %s: sem o cartão de envio da proposta e sem "Enviar link pelo WhatsApp"; a nota explica',
    async (state) => {
      await renderFicha({ ...RESERVA, contractSummary: contrato(state) });

      expect(screen.queryByRole('button', { name: 'Enviar link pelo WhatsApp' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Reenviar proposta' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Enviar proposta' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Gerar novo link/ })).not.toBeInTheDocument();
      expect(screen.getByText(NOTA)).toBeInTheDocument();
      // A confirmação da reserva continua: só o envio da proposta sai.
      expect(screen.getByRole('button', { name: 'Confirmar reserva' })).toBeInTheDocument();
      expect(bookingAPI.sendProposal).not.toHaveBeenCalled();
    },
  );

  it('contrato só preparado, ou sem contrato: o envio da proposta e o atalho do WhatsApp continuam, sem a nota', async () => {
    const preparado = await renderFicha({ ...RESERVA, contractSummary: contrato('PREPARED') });
    expect(screen.getByRole('button', { name: 'Reenviar proposta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar link pelo WhatsApp' })).toBeEnabled();
    expect(screen.queryByText(NOTA)).not.toBeInTheDocument();
    preparado.unmount();

    await renderFicha({ ...RESERVA, contractSummary: null });
    expect(screen.getByRole('button', { name: 'Reenviar proposta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar link pelo WhatsApp' })).toBeInTheDocument();
    expect(screen.queryByText(NOTA)).not.toBeInTheDocument();
  });

  // "Marcar como concluída" gravava com um clique, em qualquer status. A conclusão manda ao cliente o pedido de avaliação
  // e cria a recompensa da indicação (voltar o status não desfaz): agora pergunta antes e só aparece em confirmada ou em
  // andamento (o servidor recusa os outros status com 409).
  it.each(['DRAFT', 'PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED'])('status %s: sem "Marcar como concluída"', async (status) => {
    await renderFicha({ ...RESERVA, status, contractSummary: null });

    expect(screen.getByRole('button', { name: 'Avisar: equipe a caminho' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar como concluída' })).not.toBeInTheDocument();
  });

  it.each(['CONFIRMED', 'IN_PROGRESS'])(
    'status %s: "Marcar como concluída" pergunta antes; "Voltar" não grava, só "Concluir" muda o status',
    async (status) => {
      await renderFicha({ ...RESERVA, status, contractSummary: null });

      fireEvent.click(screen.getByRole('button', { name: 'Marcar como concluída' }));
      let janela = await screen.findByRole('dialog', { name: 'Marcar como concluída?' });
      expect(within(janela).getByText(/O cliente recebe o pedido de avaliação/)).toBeInTheDocument();
      expect(bookingAPI.updateStatus).not.toHaveBeenCalled();

      fireEvent.click(within(janela).getByRole('button', { name: 'Voltar' }));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Marcar como concluída?' })).not.toBeInTheDocument());
      expect(bookingAPI.updateStatus).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Marcar como concluída' }));
      janela = await screen.findByRole('dialog', { name: 'Marcar como concluída?' });
      fireEvent.click(within(janela).getByRole('button', { name: 'Concluir' }));

      await waitFor(() => expect(bookingAPI.updateStatus).toHaveBeenCalledTimes(1));
      expect(bookingAPI.updateStatus).toHaveBeenCalledWith('XP-ANA-20271220', 'COMPLETED', undefined);
    },
  );
});
