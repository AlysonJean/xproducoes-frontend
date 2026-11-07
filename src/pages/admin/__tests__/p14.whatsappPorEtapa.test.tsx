import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// P14 (aprovada em 02/11/2026), parte 2: "o WhatsApp ao cliente vira botões 'Enviar no WhatsApp' com texto pronto em
// cada etapa". Antes a ficha só tinha os avisos amarrados à troca de status (que paravam sem telefone) e o
// "PDF + WhatsApp"; não havia botão de recebimento, véspera nem avaliação, e o WhatsApp do painel contava como
// conversão no GA (D7: o GA não recebe o painel).
const { bookingAPI, addNotification, gaEvent } = vi.hoisted(() => ({
  bookingAPI: {
    getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn(),
    sendProposal: vi.fn(), getAuditHistory: vi.fn(), requestReview: vi.fn(),
  },
  addNotification: vi.fn(),
  gaEvent: vi.fn(),
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
vi.mock('../../../components/modals/EventManagement', () => ({ EventManagement: () => null }));
vi.mock('react-ga4', () => ({ default: { event: gaEvent } }));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
vi.mock('jspdf', () => ({
  jsPDF: class {
    text() {}
    splitTextToSize = (texto: string) => [texto];
    setFillColor() {}
    rect() {}
    addImage() {}
    setTextColor() {}
    setFontSize() {}
    setFont() {}
    setDrawColor() {}
    setLineWidth() {}
    line() {}
    textWithLink() {}
    save() {}
  },
}));

import BookingDetailPage from '../BookingDetailPage';

const LINK = 'https://g.page/r/xproducoes/review';
const base = {
  id: 'XP-ANA-20271220-2200-AB1', status: 'PENDING', deliveryStatus: 'PENDING', totalPrice: '900',
  eventTitle: 'Formatura da Ana', eventDate: '2027-12-21T01:00:00.000Z', eventEndDate: '2027-12-21T05:00:00.000Z',
  location: 'Salão Azul', neighborhood: 'Savassi', city: 'Belo Horizonte', street: 'Rua das Flores',
  clientId: null, client: null, clientName: 'Ana Souza', clientContact: '(31) 98888-7777', clientEmail: 'ana@cliente.test',
  creator: { id: 'u-ana', role: 'CLIENT' },
  pricing: { lines: [], itemsSubtotal: 900, couponDiscount: null, adjustment: 0, total: 900 },
  reviewRequestSentAt: null, reviewLink: LINK,
  attachments: [], equipments: [], services: [], eventCollaborators: [],
};

const renderFicha = async (reserva: object) => {
  bookingAPI.getById.mockResolvedValue({ data: reserva });
  render(
    <MemoryRouter initialEntries={['/admin/reservas/XP']}>
      <Routes><Route path="/admin/reservas/:id" element={<BookingDetailPage />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: /^Reserva / });
};

describe('BookingDetailPage — WhatsApp por etapa (P14 parte 2)', () => {
  let open: MockInstance<typeof window.open>;
  const aberto = (i = 0) => {
    const url = new URL(String(open.mock.calls[i][0]));
    return { para: `${url.origin}${url.pathname}`, texto: url.searchParams.get('text') ?? '' };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    bookingAPI.getAuditHistory.mockResolvedValue({ data: [] });
    bookingAPI.updateStatus.mockResolvedValue({});
    bookingAPI.updateDeliveryStatus.mockResolvedValue({});
    open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
  });
  afterEach(() => {
    open.mockRestore();
  });

  it('pedido do cliente pendente: "Responder no WhatsApp" abre o texto de recebimento, sem evento do GA', async () => {
    await renderFicha(base);

    expect(screen.getByRole('heading', { name: 'WhatsApp ao cliente' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Responder no WhatsApp' }));

    expect(open).toHaveBeenCalledTimes(1);
    expect(aberto().para).toBe('https://wa.me/5531988887777');
    expect(aberto().texto).toContain('Olá, Ana! Recebemos seu pedido XP-ANA-20271220-2200-AB1, do evento de 20/12/2027.');
    expect(gaEvent).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Enviar confirmação no WhatsApp' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pedir avaliação no Google' })).toBeNull();
  });

  it('proposta pendente lançada pelo admin: sem "Responder no WhatsApp" (o envio é o "Enviar proposta")', async () => {
    await renderFicha({ ...base, creator: { id: 'a1', role: 'ADMIN' } });

    expect(screen.queryByRole('button', { name: 'Responder no WhatsApp' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'WhatsApp ao cliente' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Enviar proposta' })).toBeInTheDocument();
  });

  it('reserva confirmada: confirmação (data e hora de Brasília, código inteiro e total) e lembrete da véspera (bairro e cidade)', async () => {
    await renderFicha({ ...base, status: 'CONFIRMED' });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar confirmação no WhatsApp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lembrete da véspera no WhatsApp' }));

    expect(open).toHaveBeenCalledTimes(2);
    expect(aberto(0).texto).toBe([
      'Olá, Ana! Sua reserva XP-ANA-20271220-2200-AB1 está confirmada.',
      'Evento "Formatura da Ana" no dia 20/12/2027, às 22:00.',
      'Valor total: R$ 900,00.',
      'Qualquer dúvida, é só responder esta mensagem.',
    ].join('\n'));
    expect(aberto(1).texto).toContain('no dia 20/12/2027, às 22:00, em Savassi, Belo Horizonte.');
    expect(aberto(1).texto).not.toContain('Rua das Flores');
    expect(gaEvent).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Responder no WhatsApp' })).toBeNull();
  });

  it('concluída: "Pedir avaliação no Google" abre o wa.me com o link já no clique (antes da resposta do servidor) e registra o pedido', async () => {
    let responder!: (value: unknown) => void;
    bookingAPI.requestReview.mockReturnValue(new Promise((resolve) => { responder = resolve; }));
    await renderFicha({ ...base, status: 'COMPLETED' });

    fireEvent.click(screen.getByRole('button', { name: 'Pedir avaliação no Google' }));

    // O WhatsApp abriu no próprio clique, com o servidor ainda sem responder.
    expect(open).toHaveBeenCalledTimes(1);
    expect(aberto().texto).toContain(LINK);
    expect(bookingAPI.requestReview).toHaveBeenCalledWith(base.id);
    expect(gaEvent).not.toHaveBeenCalled();

    responder({ data: { reviewLink: LINK, reviewRequestedAt: '2027-12-22T15:00:00.000Z' } });
    expect(await screen.findByText('Avaliação pedida em 22/12/2027')).toBeInTheDocument();
    await waitFor(() => expect(bookingAPI.getAuditHistory).toHaveBeenCalledTimes(2)); // o Histórico recarrega
  });

  it('concluída, registro que falha: o WhatsApp já abriu e o aviso de erro diz que o pedido não ficou registrado', async () => {
    bookingAPI.requestReview.mockRejectedValue(new Error('500'));
    await renderFicha({ ...base, status: 'COMPLETED' });

    fireEvent.click(screen.getByRole('button', { name: 'Pedir avaliação no Google' }));

    expect(open).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', title: 'Pedido não registrado' })));
  });

  it('concluída sem o link de avaliação configurado: botão desligado com "Configure o link de avaliação do Google"; avaliação já pedida mostra a data', async () => {
    await renderFicha({ ...base, status: 'COMPLETED', reviewLink: null, reviewRequestSentAt: '2027-12-22T15:00:00.000Z' });

    const botao = screen.getByRole('button', { name: 'Pedir avaliação no Google' });
    expect(botao).toBeDisabled();
    expect(screen.getByText('Configure o link de avaliação do Google')).toBeInTheDocument();
    expect(screen.getByText('Avaliação pedida em 22/12/2027')).toBeInTheDocument();
    fireEvent.click(botao);
    expect(open).not.toHaveBeenCalled();
    expect(bookingAPI.requestReview).not.toHaveBeenCalled();
  });

  it('sem telefone na reserva: os botões da etapa ficam desligados com "Sem telefone na reserva"', async () => {
    await renderFicha({ ...base, status: 'CONFIRMED', clientContact: null });

    expect(screen.getByRole('button', { name: 'Enviar confirmação no WhatsApp' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Lembrete da véspera no WhatsApp' })).toBeDisabled();
    expect(screen.getByText('Sem telefone na reserva')).toBeInTheDocument();
  });

  it('sem telefone: cancelar e "Confirmar e avisar pelo WhatsApp" mudam o status mesmo assim, sem abrir o WhatsApp', async () => {
    await renderFicha({ ...base, clientContact: null });

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e avisar pelo WhatsApp' }));
    const confirmar = await screen.findByRole('dialog', { name: 'Confirmar a reserva?' });
    expect(within(confirmar).getByText('Sem telefone na reserva')).toBeInTheDocument();
    fireEvent.click(within(confirmar).getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(bookingAPI.updateStatus).toHaveBeenCalledWith(base.id, 'CONFIRMED', {}));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Confirmar a reserva?' })).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    const cancelar = await screen.findByRole('dialog', { name: 'Cancelar a reserva?' });
    fireEvent.click(within(cancelar).getByRole('button', { name: 'Cancelar reserva' }));
    await waitFor(() => expect(bookingAPI.updateStatus).toHaveBeenCalledWith(base.id, 'CANCELLED', undefined));

    expect(open).not.toHaveBeenCalled();
  });

  it('com telefone: a troca de status abre o WhatsApp com o texto da etapa, sem evento do GA', async () => {
    await renderFicha(base);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e avisar pelo WhatsApp' }));
    const janela = await screen.findByRole('dialog', { name: 'Confirmar a reserva?' });
    fireEvent.click(within(janela).getByRole('button', { name: 'Confirmar' }));

    expect(open).toHaveBeenCalledTimes(1);
    expect(aberto().texto).toContain('Sua reserva XP-ANA-20271220-2200-AB1 está confirmada.');
    await waitFor(() => expect(bookingAPI.updateStatus).toHaveBeenCalledWith(base.id, 'CONFIRMED', {}));
    expect(gaEvent).not.toHaveBeenCalled();
  });

  it('"PDF + WhatsApp": o texto da proposta em PDF, aberto no clique, sem evento do GA', async () => {
    await renderFicha({ ...base, status: 'CONFIRMED' });

    fireEvent.click(screen.getByRole('button', { name: 'PDF + WhatsApp' }));

    expect(open).toHaveBeenCalledTimes(1);
    expect(aberto().texto).toBe([
      'Olá, Ana! Segue em PDF a proposta do seu evento "Formatura da Ana" (20/12/2027).',
      'Valor total: R$ 900,00.',
      'Para ajustar algo ou confirmar, é só responder esta mensagem.',
    ].join('\n'));
    expect(gaEvent).not.toHaveBeenCalled();
    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ title: 'WhatsApp aberto' })));
  });

  it('cartão Histórico: e-mails da reserva que saíram ou falharam e o pedido de avaliação, em palavras simples', async () => {
    bookingAPI.getAuditHistory.mockResolvedValue({
      data: [
        { action: 'EMAIL_FAILED', timestamp: '2027-12-09T14:00:00.000Z', actorName: null, details: { type: 'booking-approved' } },
        { action: 'EMAIL_SENT', timestamp: '2027-12-09T13:31:00.000Z', actorName: null, details: { type: 'booking-proposal' } },
        { action: 'REVIEW_REQUESTED', timestamp: '2027-12-09T13:00:00.000Z', actorName: 'Dono da Empresa', details: { channel: 'whatsapp' } },
        { action: 'EMAIL_SENT', timestamp: '2027-12-09T12:00:00.000Z', actorName: null, details: { type: 'booking-review-request' } },
      ],
    });
    await renderFicha({ ...base, status: 'COMPLETED' });

    expect(await screen.findByText('E-mail de confirmação falhou')).toBeInTheDocument();
    expect(screen.getByText('E-mail de proposta enviado')).toBeInTheDocument();
    expect(screen.getByText('E-mail de avaliação enviado')).toBeInTheDocument();
    expect(screen.getByText('Avaliação no Google pedida pelo WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('09/12/2027 às 10:00 · por Dono da Empresa')).toBeInTheDocument();
  });
});
