import type React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { bookingAPI, addNotification } = vi.hoisted(() => ({
  bookingAPI: { getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn() },
  addNotification: vi.fn(),
}));
vi.mock('../../../services/api', () => ({ bookingAPI, api: { post: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('@/hooks/useCollaborators', () => ({ useCollaborators: () => ({ collaborators: [], fetchCollaborators: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));
vi.mock('@/components/bookings/BookingCollaborators', () => ({ BookingCollaborators: () => null }));
vi.mock('@/components/bookings/BookingFinancialSummary', () => ({ BookingFinancialSummary: () => null }));
// A janela "Gerenciar Colaboradores" de verdade não importa aqui: o rodapé extra dela e o "Salvar".
vi.mock('../../../components/modals/EventManagement', () => ({
  EventManagement: ({ onSave, footerExtra }: { onSave: (assignments: unknown[]) => void; footerExtra?: React.ReactNode }) => (
    <div role="dialog" aria-label="Gerenciar Colaboradores">
      {footerExtra}
      <button type="button" onClick={() => onSave([{ id: 'a-c1', collaboratorId: 'c1', role: 'DJ', estimatedHours: 4, hourlyRate: null }])}>
        Salvar equipe da janela
      </button>
    </div>
  ),
}));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
vi.mock('jspdf', () => ({ jsPDF: class {} }));

import BookingDetailPage from '../BookingDetailPage';

// D11 (aprovada em 02/11/2026): "Avisar o cliente por e-mail", marcada por padrão, em toda tela que confirma.
// Na ficha: o cartão Confirmação (vale para "Confirmar e avisar pelo WhatsApp"), o modal "Confirmar reserva" e
// "Alocar equipe e confirmar". Desmarcada, o corpo leva notifyClient: false; marcada, o corpo fica como antes
// (o servidor avisa por padrão). Antes não havia como confirmar sem mandar o e-mail ao cliente.
const LABEL = 'Avisar o cliente por e-mail';
const pendente = {
  id: 'XP-ANA-20271220', status: 'PENDING', deliveryStatus: 'PENDING', totalPrice: '900',
  eventDate: '2027-12-21T01:00:00.000Z', eventEndDate: '2027-12-21T05:00:00.000Z', location: 'Espaço VIP',
  clientId: null, client: null,
  clientName: 'Ana Souza', clientContact: '(31) 98888-7777', clientEmail: 'ana@cliente.test',
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

const abrirModalConfirmar = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));
  return screen.findByRole('dialog', { name: 'Confirmar reserva' });
};

describe('BookingDetailPage — "Avisar o cliente por e-mail" (D11)', () => {
  let open: MockInstance<typeof window.open>;

  beforeEach(() => {
    vi.clearAllMocks();
    bookingAPI.confirmWithDetails.mockResolvedValue({});
    bookingAPI.updateStatus.mockResolvedValue({});
    open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
  });

  afterEach(() => {
    open.mockRestore();
  });

  it('modal "Confirmar reserva": a caixa vem marcada e o corpo sai como antes (o servidor avisa o cliente)', async () => {
    await renderFicha(pendente);
    const modal = await abrirModalConfirmar();

    const caixa = within(modal).getByLabelText(LABEL);
    expect(caixa).toBeChecked();
    expect(within(modal).getByText('O cliente recebe o e-mail de reserva confirmada.')).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('button', { name: 'Confirmar reserva' }));

    await waitFor(() => expect(bookingAPI.confirmWithDetails).toHaveBeenCalledTimes(1));
    const [id, corpo] = bookingAPI.confirmWithDetails.mock.calls[0];
    expect(id).toBe(pendente.id);
    expect(corpo).not.toHaveProperty('notifyClient');
  });

  it('modal "Confirmar reserva" com a caixa desmarcada: o corpo leva notifyClient: false', async () => {
    await renderFicha(pendente);
    const modal = await abrirModalConfirmar();

    fireEvent.click(within(modal).getByLabelText(LABEL));
    fireEvent.click(within(modal).getByRole('button', { name: 'Confirmar reserva' }));

    await waitFor(() => expect(bookingAPI.confirmWithDetails).toHaveBeenCalledTimes(1));
    expect(bookingAPI.confirmWithDetails.mock.calls[0][1]).toMatchObject({ notifyClient: false });
  });

  it('reserva sem e-mail do cliente: a caixa fica desligada e diz o porquê', async () => {
    await renderFicha({ ...pendente, clientEmail: null, clientContact: '31977776666' });

    const caixa = screen.getByLabelText(LABEL);
    expect(caixa).toBeDisabled();
    expect(caixa).not.toBeChecked();
    expect(screen.getByText('Esta reserva não tem e-mail do cliente.')).toBeInTheDocument();
  });

  it('"Confirmar e avisar pelo WhatsApp" com a caixa do cartão desmarcada: a confirmação leva notifyClient: false', async () => {
    await renderFicha(pendente);

    fireEvent.click(screen.getByLabelText(LABEL));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e avisar pelo WhatsApp' }));
    const janela = await screen.findByRole('dialog', { name: 'Confirmar a reserva?' });
    fireEvent.click(within(janela).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(bookingAPI.updateStatus).toHaveBeenCalledWith(pendente.id, 'CONFIRMED', { notifyClient: false }));
  });

  it('"Alocar equipe e confirmar" em reserva pendente: a janela tem a caixa, e desmarcada o corpo leva notifyClient: false', async () => {
    await renderFicha(pendente);

    fireEvent.click(screen.getByRole('button', { name: 'Alocar equipe e confirmar' }));
    const janela = await screen.findByRole('dialog', { name: 'Gerenciar Colaboradores' });
    fireEvent.click(within(janela).getByLabelText(LABEL));
    fireEvent.click(within(janela).getByRole('button', { name: 'Salvar equipe da janela' }));

    await waitFor(() => expect(bookingAPI.confirmWithDetails).toHaveBeenCalledTimes(1));
    expect(bookingAPI.confirmWithDetails.mock.calls[0][1]).toEqual({
      collaborators: [{ collaboratorId: 'c1', role: 'DJ', totalHours: 4 }],
      notifyClient: false,
    });
  });

  it('"Alocar equipe e confirmar" em reserva já confirmada: salvar não confirma de novo, e a caixa não aparece', async () => {
    await renderFicha({ ...pendente, status: 'CONFIRMED' });

    fireEvent.click(screen.getByRole('button', { name: 'Alocar equipe e confirmar' }));
    const janela = await screen.findByRole('dialog', { name: 'Gerenciar Colaboradores' });

    expect(within(janela).queryByLabelText(LABEL)).not.toBeInTheDocument();
  });

  it('a janela "Gerenciar Colaboradores" de verdade mostra o rodapé extra (onde a caixa aparece)', async () => {
    const { EventManagement } = await vi.importActual<typeof import('../../../components/modals/EventManagement')>(
      '../../../components/modals/EventManagement',
    );
    render(
      <EventManagement
        event={{ id: 'XP-1', title: 'Formatura', startDate: '2027-12-21T01:00:00.000Z', startTime: '2027-12-21T01:00:00.000Z', location: 'Espaço VIP' }}
        collaborators={[]}
        onSave={vi.fn()}
        onClose={vi.fn()}
        footerExtra={<span>rodapé extra</span>}
      />,
    );

    expect(await screen.findByText('rodapé extra')).toBeInTheDocument();
  });
});
