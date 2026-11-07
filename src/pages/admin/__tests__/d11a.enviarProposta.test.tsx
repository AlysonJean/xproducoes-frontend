import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// D11 (aprovada em 02/11/2026), parte (a): "a ficha ganha 'Enviar proposta': e-mail com o link seguro, WhatsApp com o
// mesmo link e registro do envio". Antes não havia envio nenhum: a Proposta Rápida prometia um link que a ficha não
// mostrava, e o botão da lista mandava /proposta/<número>, que exige login.
const { bookingAPI, addNotification, gaEvent } = vi.hoisted(() => ({
  bookingAPI: {
    getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn(),
    sendProposal: vi.fn(), getAuditHistory: vi.fn(),
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
vi.mock('react-ga4', () => ({ default: { event: gaEvent } }));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
vi.mock('jspdf', () => ({ jsPDF: class {} }));

import BookingDetailPage from '../BookingDetailPage';

const LINK = 'https://www.xproducoeseeventos.com.br/proposta#token=p1.TESTE';
const pendente = {
  id: 'XP-ANA-20271220-2200-AB1', status: 'PENDING', deliveryStatus: 'PENDING', totalPrice: '900',
  eventTitle: 'Formatura da Ana', eventDate: '2027-12-21T01:00:00.000Z', eventEndDate: '2027-12-21T05:00:00.000Z',
  location: 'Espaço VIP', clientId: null, client: null,
  clientName: 'Ana Souza', clientContact: '(31) 98888-7777', clientEmail: 'ana@cliente.test',
  attachments: [], equipments: [], services: [], eventCollaborators: [],
};
const enviado = (status = 'queued') => ({ data: { link: LINK, expiresAt: '2027-12-15T02:59:59.999Z', email: { status } } });

const renderFicha = async (reserva: object) => {
  bookingAPI.getById.mockResolvedValue({ data: reserva });
  render(
    <MemoryRouter initialEntries={['/admin/reservas/XP']}>
      <Routes><Route path="/admin/reservas/:id" element={<BookingDetailPage />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: /^Reserva / });
};

const enviar = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }));
  return screen.findByRole('dialog', { name: 'Proposta enviada' });
};

describe('BookingDetailPage — "Enviar proposta" (D11)', () => {
  let open: MockInstance<typeof window.open>;

  beforeEach(() => {
    vi.clearAllMocks();
    bookingAPI.sendProposal.mockResolvedValue(enviado());
    bookingAPI.getAuditHistory.mockResolvedValue({ data: [] });
    open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
  });

  afterEach(() => {
    open.mockRestore();
  });

  it('chama a API e abre a janela com a situação do e-mail, a validade, o link e a prévia do WhatsApp', async () => {
    await renderFicha(pendente);

    const janela = await enviar();

    expect(bookingAPI.sendProposal).toHaveBeenCalledTimes(1);
    expect(bookingAPI.sendProposal).toHaveBeenCalledWith('XP-ANA-20271220-2200-AB1', undefined);
    expect(within(janela).getByText('O e-mail com o link entrou na fila de envio e chega ao cliente em instantes.')).toBeInTheDocument();
    expect(within(janela).getByText('A proposta vale até 14/12/2027.')).toBeInTheDocument();
    expect(within(janela).getByLabelText('Link da proposta')).toHaveValue(LINK);
    expect(within(janela).getByLabelText('Prévia da mensagem do WhatsApp').textContent).toBe(
      `Olá, Ana! A proposta do seu evento "Formatura da Ana" (20/12/2027) está pronta.\nVeja os itens e o valor neste link: ${LINK}\nA proposta vale até 14/12/2027. Qualquer dúvida, é só responder esta mensagem.`,
    );
    // A ficha e o histórico recarregam (o rascunho vira pendente; o envio entra no histórico).
    await waitFor(() => expect(bookingAPI.getById).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(bookingAPI.getAuditHistory).toHaveBeenCalledTimes(2));
  });

  it('"Abrir WhatsApp": abre o wa.me do cliente com o texto e o link no próprio clique, sem evento do GA', async () => {
    await renderFicha(pendente);
    const janela = await enviar();

    fireEvent.click(within(janela).getByRole('button', { name: 'Abrir WhatsApp' }));

    // Sem await entre o clique e o window.open: o bloqueador de pop-up não segura a aba.
    expect(open).toHaveBeenCalledTimes(1);
    const url = new URL(String(open.mock.calls[0][0]));
    expect(`${url.origin}${url.pathname}`).toBe('https://wa.me/5531988887777');
    expect(url.searchParams.get('text')).toContain(`Veja os itens e o valor neste link: ${LINK}`);
    expect(open.mock.calls[0][1]).toBe('_blank');
    expect(gaEvent).not.toHaveBeenCalled();
  });

  it('reserva sem telefone: "Abrir WhatsApp" desligado, com "Sem telefone na reserva"', async () => {
    await renderFicha({ ...pendente, clientContact: null });
    const janela = await enviar();

    expect(within(janela).getByRole('button', { name: 'Abrir WhatsApp' })).toBeDisabled();
    expect(within(janela).getByText('Sem telefone na reserva')).toBeInTheDocument();
  });

  it('e-mail que não saiu (reserva sem e-mail): a janela diz em português simples', async () => {
    bookingAPI.sendProposal.mockResolvedValue(enviado('skipped_no_email'));
    await renderFicha({ ...pendente, clientEmail: null });

    const janela = await enviar();

    expect(within(janela).getByText('A reserva não tem e-mail do cliente. Mande o link pelo WhatsApp ou copie o link.')).toBeInTheDocument();
  });

  it('"Copiar link" copia o link da proposta', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await renderFicha(pendente);
    const janela = await enviar();

    fireEvent.click(within(janela).getByRole('button', { name: 'Copiar link' }));

    expect(writeText).toHaveBeenCalledWith(LINK);
    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Link copiado' })));
  });

  it('"Gerar novo link" pede confirmação ("O link anterior deixa de funcionar."); confirmado, chama a API com rotate', async () => {
    await renderFicha(pendente);
    const janela = await enviar();

    fireEvent.click(within(janela).getByRole('button', { name: 'Gerar novo link' }));
    const confirmacao = await screen.findByRole('dialog', { name: 'Gerar novo link?' });
    // O e-mail com o novo link segue a mesma regra do envio: só com e-mail na reserva e sem o cliente ter desligado os
    // e-mails de reserva (a janela não promete o que o servidor não faz).
    expect(within(confirmacao).getByText(
      'O link anterior deixa de funcionar. O novo link vai por e-mail quando a reserva tem e-mail e o cliente não desligou os e-mails de reserva.',
    )).toBeInTheDocument();
    expect(bookingAPI.sendProposal).toHaveBeenCalledTimes(1);

    fireEvent.click(within(confirmacao).getByRole('button', { name: 'Gerar novo link' }));

    await waitFor(() => expect(bookingAPI.sendProposal).toHaveBeenCalledTimes(2));
    expect(bookingAPI.sendProposal).toHaveBeenLastCalledWith('XP-ANA-20271220-2200-AB1', { rotate: true });
  });

  it('enquanto o envio não volta, "Enviar proposta" fica desligado: dois cliques mandam um pedido só', async () => {
    let responder: (value: unknown) => void = () => undefined;
    bookingAPI.sendProposal.mockReturnValue(new Promise((resolve) => { responder = resolve; }));
    await renderFicha(pendente);
    const botao = screen.getByRole('button', { name: /Enviar proposta/ });

    fireEvent.click(botao);
    fireEvent.click(botao);

    expect(botao).toBeDisabled();
    expect(bookingAPI.sendProposal).toHaveBeenCalledTimes(1);
    responder(enviado());
    expect(await screen.findByRole('dialog', { name: 'Proposta enviada' })).toBeInTheDocument();
  });

  it('erro da API (proposta sem valor): a mensagem do servidor aparece e a janela não abre', async () => {
    bookingAPI.sendProposal.mockRejectedValue({
      isAxiosError: true,
      response: { status: 422, data: { success: false, message: 'A proposta está sem valor. Defina o valor antes de enviar.' } },
    });
    await renderFicha(pendente);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith({
      type: 'error', title: 'Proposta não enviada', message: 'A proposta está sem valor. Defina o valor antes de enviar.',
    }));
    expect(screen.queryByRole('dialog', { name: 'Proposta enviada' })).toBeNull();
  });

  it('cartão Histórico: os envios da proposta com data de Brasília, o que aconteceu e quem enviou', async () => {
    bookingAPI.getAuditHistory.mockResolvedValue({
      data: [
        { action: 'PROPOSAL_SENT', timestamp: '2027-12-09T13:30:00.000Z', actorName: 'Dono da Empresa', details: { emailStatus: 'skipped_no_email', rotated: true } },
        { action: 'PROPOSAL_LINK_ISSUED', timestamp: '2027-12-09T13:30:00.000Z', actorName: 'Dono da Empresa', details: {} },
        { action: 'PROPOSAL_SENT', timestamp: '2027-12-08T13:30:00.000Z', actorName: 'Dono da Empresa', details: { emailStatus: 'queued', rotated: false } },
      ],
    });
    await renderFicha(pendente);

    expect(await screen.findByText('Proposta enviada por e-mail')).toBeInTheDocument();
    expect(screen.getByText('Link da proposta gerado (a reserva não tem e-mail), com link novo')).toBeInTheDocument();
    expect(screen.getByText('08/12/2027 às 10:30 · por Dono da Empresa')).toBeInTheDocument();
    expect(bookingAPI.getAuditHistory).toHaveBeenCalledWith('XP-ANA-20271220-2200-AB1');
  });

  it('reserva confirmada: sem "Enviar proposta"', async () => {
    await renderFicha({ ...pendente, status: 'CONFIRMED' });

    expect(screen.queryByRole('button', { name: 'Enviar proposta' })).toBeNull();
  });
});
