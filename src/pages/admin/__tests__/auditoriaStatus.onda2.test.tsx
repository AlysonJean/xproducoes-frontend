import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';

// Onda 2 da auditoria do status da reserva (decisões de Alyson de 21/11/2026), na ficha:
// - D2/D3: cancelar mostra o que acontece (equipe e Google Agenda) e "Avisar o cliente por e-mail" (marcada);
// - D9: com contrato aceito, desistência do cliente (pela rota da desistência, sem motivo) ou cancelamento pela tabela;
// - D6: confirmar a reserva aceita sem pagamento pergunta "registrar o sinal como recebido" (marcada);
// - D1: a confirmação mostra o aviso da pré-reserva que o servidor devolve;
// - D4/D5: "Iniciar evento" a partir do dia do evento; o evento que já passou pede a conclusão.
// Revisão da onda 2: a desistência só dentro do prazo; o rascunho nunca enviado cancela sem o aviso marcado; o aviso do
// cancelamento tem a caixa dele; "Alocar equipe e confirmar" também pergunta o sinal e mostra a pré-reserva.
const { bookingAPI, addNotification, eventManagement } = vi.hoisted(() => ({
  eventManagement: { props: null as null | { footerExtra?: unknown; onSave: (a: unknown[]) => Promise<void> } },
  bookingAPI: {
    getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn(),
    sendProposal: vi.fn(), getAuditHistory: vi.fn(), requestReview: vi.fn(), cancel: vi.fn(), withdrawForClient: vi.fn(),
  },
  addNotification: vi.fn(),
}));
vi.mock('../../../services/api', () => ({ bookingAPI, api: { post: vi.fn(), delete: vi.fn() } }));
vi.mock('@/services/api', () => ({ bookingAPI, api: { post: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('@/hooks/useCollaborators', () => ({ useCollaborators: () => ({ collaborators: [], fetchCollaborators: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));
vi.mock('@/components/bookings/BookingCollaborators', () => ({ BookingCollaborators: () => null }));
vi.mock('@/components/bookings/BookingFinancialSummary', () => ({ BookingFinancialSummary: () => null }));
vi.mock('../../../components/modals/EventManagement', () => ({
  EventManagement: (props: { footerExtra?: ReactNode; onSave: (a: unknown[]) => Promise<void> }) => {
    eventManagement.props = props;
    return <div data-testid="equipe">{props.footerExtra}</div>;
  },
}));
vi.mock('../../../components/proposal/AdminContractCard', () => ({ AdminContractCard: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import BookingDetailPage from '../BookingDetailPage';

const DAY = 24 * 60 * 60 * 1000;
const futuro = new Date(Date.now() + 30 * DAY);
const base = {
  id: 'XP-ANA-1', status: 'PENDING', deliveryStatus: 'PENDING', paymentStatus: null, totalPrice: '900',
  eventTitle: 'Formatura', eventDate: futuro.toISOString(), eventEndDate: new Date(futuro.getTime() + 4 * 3600 * 1000).toISOString(),
  location: 'Salão Azul', clientId: null, client: null, clientName: 'Ana Souza', clientContact: null, clientEmail: 'ana@cliente.test',
  creator: { id: 'u-ana', role: 'CLIENT' }, pricing: { lines: [], itemsSubtotal: 900, couponDiscount: null, adjustment: 0, total: 900 },
  attachments: [], equipments: [], services: [], eventCollaborators: [], contractSummary: null,
};
const aceito = { state: 'ACCEPTED', acceptedAt: new Date(Date.now() - DAY).toISOString(), withdrawUntil: new Date(Date.now() + 6 * DAY).toISOString(), partyName: 'Ana Souza' };

const renderFicha = async (reserva: object) => {
  bookingAPI.getById.mockResolvedValue({ data: reserva });
  render(
    <MemoryRouter initialEntries={['/admin/reservas/XP']}>
      <Routes><Route path="/admin/reservas/:id" element={<BookingDetailPage />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: /^Reserva / });
};

describe('ficha — onda 2 da auditoria do status', () => {
  let open: MockInstance<typeof window.open>;
  beforeEach(() => {
    vi.clearAllMocks();
    bookingAPI.getAuditHistory.mockResolvedValue({ data: [] });
    bookingAPI.updateStatus.mockResolvedValue({ data: {} });
    bookingAPI.confirmWithDetails.mockResolvedValue({ data: {} });
    bookingAPI.cancel.mockResolvedValue({ data: {} });
    bookingAPI.withdrawForClient.mockResolvedValue({ data: {} });
    open = vi.spyOn(window, 'open').mockReturnValue(null);
  });
  afterEach(() => open.mockRestore());

  const abrirCancelar = async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    return screen.findByRole('dialog', { name: 'Cancelar a reserva?' });
  };

  it('D2/D3: cancelar diz o que acontece com a equipe e a agenda; "Avisar o cliente" desmarcada vai como notifyClient: false', async () => {
    await renderFicha(base);
    const janela = await abrirCancelar();

    expect(within(janela).getByText('A equipe escalada sai da escala e recebe um aviso por e-mail, e o evento sai da Google Agenda.')).toBeInTheDocument();
    const avisar = within(janela).getByLabelText('Avisar o cliente por e-mail');
    expect(avisar).toBeChecked();
    expect(within(janela).getByText('O cliente recebe o e-mail de reserva cancelada.')).toBeInTheDocument();
    fireEvent.click(avisar);
    fireEvent.change(within(janela).getByLabelText('Motivo do cancelamento'), { target: { value: 'Chuva' } });
    fireEvent.click(within(janela).getByRole('button', { name: 'Cancelar reserva' }));

    await waitFor(() => expect(bookingAPI.cancel).toHaveBeenCalledWith(base.id, 'Chuva', { notifyClient: false }));
    // Sem contrato aceito, não há a escolha da desistência.
    expect(screen.queryByText('O cliente já aceitou o contrato')).not.toBeInTheDocument();
  });

  it('D9: com contrato aceito, "Desistência do cliente" vai pela rota da desistência, sem motivo nem caixa do aviso', async () => {
    await renderFicha({ ...base, contractSummary: aceito });
    const janela = await abrirCancelar();

    expect(within(janela).getByText('O cliente já aceitou o contrato')).toBeInTheDocument();
    fireEvent.click(within(janela).getByRole('radio', { name: /Desistência do cliente/ }));
    expect(within(janela).queryByLabelText('Motivo do cancelamento')).not.toBeInTheDocument();
    expect(within(janela).queryByLabelText('Avisar o cliente por e-mail')).not.toBeInTheDocument();
    fireEvent.click(within(janela).getByRole('button', { name: 'Cancelar reserva' }));

    await waitFor(() => expect(bookingAPI.withdrawForClient).toHaveBeenCalledWith(base.id));
    expect(bookingAPI.cancel).not.toHaveBeenCalled();
  });

  it.each([
    ['vencido', new Date(Date.now() - DAY).toISOString()],
    ['sem prazo (revenda)', null],
  ])('revisão: prazo de desistência %s: a janela não oferece a desistência e diz que vale a tabela', async (_caso, withdrawUntil) => {
    await renderFicha({ ...base, contractSummary: { ...aceito, withdrawUntil } });
    const janela = await abrirCancelar();

    expect(within(janela).queryByRole('radio', { name: /Desistência do cliente/ })).not.toBeInTheDocument();
    expect(within(janela).getByText(/vale a tabela de cancelamento do contrato/)).toBeInTheDocument();
    fireEvent.change(within(janela).getByLabelText('Motivo do cancelamento'), { target: { value: 'Mudou de ideia' } });
    fireEvent.click(within(janela).getByRole('button', { name: 'Cancelar reserva' }));
    await waitFor(() => expect(bookingAPI.cancel).toHaveBeenCalledWith(base.id, 'Mudou de ideia', {}));
    expect(bookingAPI.withdrawForClient).not.toHaveBeenCalled();
  });

  it('revisão: rascunho nunca enviado: "Avisar o cliente" começa desmarcada no cancelamento', async () => {
    await renderFicha({ ...base, status: 'DRAFT' });
    const janela = await abrirCancelar();

    expect(within(janela).getByLabelText('Avisar o cliente por e-mail')).not.toBeChecked();
    fireEvent.change(within(janela).getByLabelText('Motivo do cancelamento'), { target: { value: 'Rascunho' } });
    fireEvent.click(within(janela).getByRole('button', { name: 'Cancelar reserva' }));
    await waitFor(() => expect(bookingAPI.cancel).toHaveBeenCalledWith(base.id, 'Rascunho', { notifyClient: false }));
  });

  it('revisão: desmarcar o aviso no cancelamento e desistir não tira o aviso da confirmação', async () => {
    await renderFicha(base);
    const janela = await abrirCancelar();
    fireEvent.click(within(janela).getByLabelText('Avisar o cliente por e-mail'));
    fireEvent.click(within(janela).getByRole('button', { name: 'Voltar' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cancelar a reserva?' })).not.toBeInTheDocument());

    expect(screen.getByLabelText('Avisar o cliente por e-mail')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));
    const confirmar = await screen.findByRole('dialog', { name: 'Confirmar reserva' });
    fireEvent.click(within(confirmar).getByRole('button', { name: 'Confirmar reserva' }));
    await waitFor(() => expect(bookingAPI.confirmWithDetails).toHaveBeenCalledTimes(1));
    expect(bookingAPI.confirmWithDetails.mock.calls[0][1]).not.toHaveProperty('notifyClient');
  });

  it('revisão: "Alocar equipe e confirmar" pergunta o sinal (marcada), manda markInitialPaymentReceived e mostra a pré-reserva', async () => {
    bookingAPI.confirmWithDetails.mockResolvedValue({ data: { conflictWarning: 'Atenção: pré-reservado.' } });
    await renderFicha({ ...base, contractSummary: aceito });
    fireEvent.click(screen.getByRole('button', { name: 'Alocar equipe e confirmar' }));
    const equipe = await screen.findByTestId('equipe');

    expect(within(equipe).getByLabelText('Registrar o sinal como recebido')).toBeChecked();
    await eventManagement.props?.onSave([{ collaboratorId: 'c1', role: 'DJ', estimatedHours: 5, hourlyRate: null }]);

    expect(bookingAPI.confirmWithDetails).toHaveBeenCalledWith(base.id, expect.objectContaining({ markInitialPaymentReceived: true }));
    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', message: 'Atenção: pré-reservado.' })));
  });

  it('D9: com contrato aceito, "Cancelamento" (padrão) vai pelo cancelamento com o motivo', async () => {
    await renderFicha({ ...base, contractSummary: aceito });
    const janela = await abrirCancelar();

    expect(within(janela).getByRole('radio', { name: /Cancelamento/ })).toBeChecked();
    fireEvent.change(within(janela).getByLabelText('Motivo do cancelamento'), { target: { value: 'Mudou de ideia' } });
    fireEvent.click(within(janela).getByRole('button', { name: 'Cancelar reserva' }));

    await waitFor(() => expect(bookingAPI.cancel).toHaveBeenCalledWith(base.id, 'Mudou de ideia', {}));
    expect(bookingAPI.withdrawForClient).not.toHaveBeenCalled();
  });

  it('D6: confirmar a reserva aceita sem pagamento pergunta "registrar o sinal" (marcada) e manda markInitialPaymentReceived', async () => {
    await renderFicha({ ...base, contractSummary: aceito });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));
    const janela = await screen.findByRole('dialog', { name: 'Confirmar reserva' });

    expect(within(janela).getByLabelText('Registrar o sinal como recebido')).toBeChecked();
    fireEvent.click(within(janela).getByRole('button', { name: 'Confirmar reserva' }));

    await waitFor(() => expect(bookingAPI.confirmWithDetails).toHaveBeenCalledWith(base.id, expect.objectContaining({ markInitialPaymentReceived: true })));
  });

  it('D6: desmarcada, não manda; com o pagamento já registrado (ou sem contrato), a pergunta nem aparece', async () => {
    await renderFicha({ ...base, contractSummary: aceito });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));
    let janela = await screen.findByRole('dialog', { name: 'Confirmar reserva' });
    fireEvent.click(within(janela).getByLabelText('Registrar o sinal como recebido'));
    fireEvent.click(within(janela).getByRole('button', { name: 'Confirmar reserva' }));
    await waitFor(() => expect(bookingAPI.confirmWithDetails).toHaveBeenCalledTimes(1));
    expect(bookingAPI.confirmWithDetails.mock.calls[0][1]).not.toHaveProperty('markInitialPaymentReceived');

    janela = screen.queryByRole('dialog', { name: 'Confirmar reserva' }) as HTMLElement;
    expect(janela).toBeNull();
  });

  it('D6: pelo "Confirmar e avisar pelo WhatsApp" também (a caixa fica na janela)', async () => {
    await renderFicha({ ...base, contractSummary: aceito });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e avisar pelo WhatsApp' }));
    const janela = await screen.findByRole('dialog', { name: 'Confirmar a reserva?' });
    expect(within(janela).getByLabelText('Registrar o sinal como recebido')).toBeChecked();
    fireEvent.click(within(janela).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(bookingAPI.updateStatus).toHaveBeenCalledWith(base.id, 'CONFIRMED', { markInitialPaymentReceived: true }));
  });

  it('onda 2b (D8): a reserva reembolsada diz quanto foi devolvido e quando', async () => {
    await renderFicha({ ...base, status: 'REFUNDED', paymentStatus: 'REFUNDED', refundAmount: '450.00', refundedAt: '2026-11-20T15:00:00.000Z' });

    expect(
      screen.getByText('Reserva reembolsada: R$ 450,00 devolvidos em 20/11/2026. Se o reembolso foi um engano, volte para Cancelada na lista de Reservas.'),
    ).toBeInTheDocument();
  });

  it('onda 2b (B3): confirmar de novo sem repetir o aviso: a ficha diz que o cliente já tinha recebido a confirmação', async () => {
    bookingAPI.confirmWithDetails.mockResolvedValue({ data: { confirmationNoticeSkipped: true } });
    await renderFicha(base);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));
    const janela = await screen.findByRole('dialog', { name: 'Confirmar reserva' });
    fireEvent.click(within(janela).getByRole('button', { name: 'Confirmar reserva' }));

    await waitFor(() =>
      expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'info',
        message: 'O cliente já tinha recebido a confirmação desta data: o e-mail e o aviso no site não foram repetidos.',
      })),
    );
  });

  it('D1: o aviso da pré-reserva que a confirmação devolve aparece como alerta', async () => {
    bookingAPI.confirmWithDetails.mockResolvedValue({ data: { conflictWarning: 'Atenção: o mesmo equipamento está pré-reservado.' } });
    await renderFicha(base);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));
    const janela = await screen.findByRole('dialog', { name: 'Confirmar reserva' });
    expect(within(janela).queryByLabelText('Registrar o sinal como recebido')).not.toBeInTheDocument();
    fireEvent.click(within(janela).getByRole('button', { name: 'Confirmar reserva' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', message: 'Atenção: o mesmo equipamento está pré-reservado.' })));
  });

  it('B5-05 (auditoria de 19/11): o aviso de estoque que a confirmação devolve aparece junto com o da pré-reserva', async () => {
    bookingAPI.confirmWithDetails.mockResolvedValue({ data: { conflictWarning: 'Atenção: pré-reservado.', stockWarning: 'Atenção ao estoque: "Mesa X".' } });
    await renderFicha(base);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));
    const janela = await screen.findByRole('dialog', { name: 'Confirmar reserva' });
    fireEvent.click(within(janela).getByRole('button', { name: 'Confirmar reserva' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith({ type: 'warning', title: 'Estoque no mesmo período', message: 'Atenção ao estoque: "Mesa X".' }));
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ title: 'Pré-reserva no mesmo equipamento', message: 'Atenção: pré-reservado.' }));
  });

  it('D5: "Iniciar evento" a partir do dia do evento, só na confirmada; pergunta antes e grava Em andamento', async () => {
    const hoje = new Date(Date.now() + 60 * 60 * 1000);
    await renderFicha({ ...base, status: 'CONFIRMED', eventDate: hoje.toISOString(), eventEndDate: new Date(hoje.getTime() + 4 * 3600 * 1000).toISOString() });

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar evento' }));
    const janela = await screen.findByRole('dialog', { name: 'Iniciar o evento?' });
    fireEvent.click(within(janela).getByRole('button', { name: 'Iniciar' }));

    await waitFor(() => expect(bookingAPI.updateStatus).toHaveBeenCalledWith(base.id, 'IN_PROGRESS', undefined));
  });

  it('D5: antes do dia do evento, sem "Iniciar evento"', async () => {
    await renderFicha({ ...base, status: 'CONFIRMED' });
    expect(screen.queryByRole('button', { name: 'Iniciar evento' })).not.toBeInTheDocument();
  });

  it('D4: o evento que já terminou e segue confirmado pede a conclusão', async () => {
    const ontem = new Date(Date.now() - DAY);
    await renderFicha({ ...base, status: 'CONFIRMED', eventDate: new Date(ontem.getTime() - 4 * 3600 * 1000).toISOString(), eventEndDate: ontem.toISOString() });

    expect(screen.getByText('O evento já passou')).toBeInTheDocument();
    expect(screen.getByText('Marque como concluída para ele entrar no faturamento.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marcar como concluída' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar evento' })).not.toBeInTheDocument();
  });
});
