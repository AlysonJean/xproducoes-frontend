import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch, api, useAuth, addNotification, XLSX } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  api: { get: vi.fn(), delete: vi.fn() },
  useAuth: vi.fn(),
  addNotification: vi.fn(),
  XLSX: {
    utils: { json_to_sheet: vi.fn(() => ({})), book_new: vi.fn(() => ({})), book_append_sheet: vi.fn() },
    writeFile: vi.fn(),
  },
}));
vi.mock('xlsx-js-style', () => ({ default: XLSX, ...XLSX }));
vi.mock('../../../services/api', () => ({ apiFetch, api }));
vi.mock('@/services/api', () => ({ apiFetch, api }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));
vi.mock('@/components/modals/ManualBookingModal', () => ({ ManualBookingModal: () => null }));
vi.mock('@/components/ui/BrandLoader', () => ({ BrandLoader: () => null, default: () => null }));
// O react-big-calendar mede o layout (o jsdom não tem medidas): no lugar dele, um botão por reserva (mesmo stub
// de confirmOnce.BookingCalendarPage.test.tsx).
type StubEvent = { title: string; resource: { id: string } };
vi.mock('react-big-calendar', () => ({
  Calendar: () => null,
  dateFnsLocalizer: () => ({}),
  Views: { MONTH: 'month', WEEK: 'week', DAY: 'day', AGENDA: 'agenda' },
}));
vi.mock('react-big-calendar/lib/addons/dragAndDrop', () => ({
  default: () => ({ events, onSelectEvent }: { events: StubEvent[]; onSelectEvent: (event: StubEvent) => void }) => (
    <div>
      {events.map((event) => (
        <button key={event.resource.id} type="button" onClick={() => onSelectEvent(event)}>
          {event.title}
        </button>
      ))}
    </div>
  ),
}));

import BookingListPage from '../BookingListPage';
import BookingCalendarPage from '../BookingCalendarPage';

// D11 (aprovada em 02/11/2026): toda tela que confirma tem "Avisar o cliente por e-mail", marcada por padrão.
// Na lista de Reservas, escolher "Confirmada" no status da linha gravava na hora e avisava o cliente sem
// perguntar; agora abre a confirmação com a caixa. Na agenda, o modal "Confirmar reserva" ganha a caixa.
const LABEL = 'Avisar o cliente por e-mail';

const linha = (extra: Record<string, unknown>) => ({
  id: 'XP-1', status: 'PENDING', deliveryStatus: 'PENDING', totalPrice: '900', eventDate: '2027-12-21T01:00:00.000Z',
  clientName: 'Bruno Lima', clientContact: '31977776666', clientEmail: 'bruno@cliente.test',
  client: null,
  ...extra,
});

const patches = () => apiFetch.mock.calls.filter(([, init]) => init?.method === 'PATCH');

const renderLista = async (reservas: object[]) => {
  apiFetch.mockImplementation((url: string, init?: { method?: string }) =>
    Promise.resolve(init?.method ? {} : url.startsWith('/admin/bookings') ? reservas : []));
  render(<MemoryRouter initialEntries={['/admin/reservas']}><BookingListPage /></MemoryRouter>);
  return screen.findByLabelText('Status da reserva XP-1');
};

describe('lista de Reservas — "Confirmada" no status da linha (D11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });

  it('reserva pendente: pergunta antes de gravar; com a caixa desmarcada, o PATCH leva notifyClient: false', async () => {
    const status = await renderLista([linha({})]);

    fireEvent.change(status, { target: { value: 'CONFIRMED' } });
    const dialogo = await screen.findByRole('dialog', { name: 'Confirmar a reserva?' });
    expect(patches()).toHaveLength(0);
    const caixa = within(dialogo).getByLabelText(LABEL);
    expect(caixa).toBeChecked();
    fireEvent.click(caixa);
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(patches()).toHaveLength(1));
    const [url, init] = patches()[0];
    expect(url).toBe('/admin/bookings/XP-1/status');
    expect(JSON.parse(init.body)).toEqual({ status: 'CONFIRMED', notifyClient: false });
  });

  it('com a caixa marcada, o PATCH sai como antes (o servidor avisa o cliente)', async () => {
    const status = await renderLista([linha({})]);

    fireEvent.change(status, { target: { value: 'CONFIRMED' } });
    const dialogo = await screen.findByRole('dialog', { name: 'Confirmar a reserva?' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(JSON.parse(patches()[0][1].body)).toEqual({ status: 'CONFIRMED' });
  });

  it('"Cancelar" no diálogo não grava nada', async () => {
    const status = await renderLista([linha({})]);

    fireEvent.change(status, { target: { value: 'CONFIRMED' } });
    const dialogo = await screen.findByRole('dialog', { name: 'Confirmar a reserva?' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Confirmar a reserva?' })).not.toBeInTheDocument());
    expect(patches()).toHaveLength(0);
  });

  it('a caixa volta marcada a cada diálogo: desmarcar e cancelar não vale para a próxima confirmação', async () => {
    const status = await renderLista([linha({})]);

    fireEvent.change(status, { target: { value: 'CONFIRMED' } });
    const primeiro = await screen.findByRole('dialog', { name: 'Confirmar a reserva?' });
    fireEvent.click(within(primeiro).getByLabelText(LABEL));
    expect(within(primeiro).getByLabelText(LABEL)).not.toBeChecked();
    fireEvent.click(within(primeiro).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Confirmar a reserva?' })).not.toBeInTheDocument());

    fireEvent.change(status, { target: { value: 'CONFIRMED' } });
    const segundo = await screen.findByRole('dialog', { name: 'Confirmar a reserva?' });
    expect(within(segundo).getByLabelText(LABEL)).toBeChecked();
    fireEvent.click(within(segundo).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(JSON.parse(patches()[0][1].body)).toEqual({ status: 'CONFIRMED' });
  });

  it('reserva sem e-mail do cliente: a caixa do diálogo fica desligada', async () => {
    const status = await renderLista([linha({ clientEmail: null })]);

    fireEvent.change(status, { target: { value: 'CONFIRMED' } });
    const dialogo = await screen.findByRole('dialog', { name: 'Confirmar a reserva?' });

    expect(within(dialogo).getByLabelText(LABEL)).toBeDisabled();
    expect(within(dialogo).getByText('Esta reserva não tem e-mail do cliente.')).toBeInTheDocument();
  });

  it('evento concluído devolvido a Confirmada: grava direto, sem diálogo (o servidor não avisa ninguém)', async () => {
    const status = await renderLista([linha({ status: 'COMPLETED' })]);

    fireEvent.change(status, { target: { value: 'CONFIRMED' } });

    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(JSON.parse(patches()[0][1].body)).toEqual({ status: 'CONFIRMED' });
    expect(screen.queryByRole('dialog', { name: 'Confirmar a reserva?' })).not.toBeInTheDocument();
  });
});

describe('agenda — modal "Confirmar reserva" (D11)', () => {
  const pendente = { id: 'XP-7', status: 'PENDING', eventDate: '2027-12-05T21:00:00.000Z', duration: 4, totalPrice: 750, client: { name: 'Cliente Teste' } };

  const abrirModal = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'Cliente Teste' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar reserva' }));
    return screen.findByRole('dialog', { name: 'Confirmar reserva' });
  };
  const corpoDoPut = async () => {
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/bookings/XP-7/confirm-details', expect.objectContaining({ method: 'PUT' })),
    );
    const [, init] = apiFetch.mock.calls.find(([url]) => url === '/bookings/XP-7/confirm-details')!;
    return JSON.parse(init.body);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    apiFetch.mockImplementation((url: string) => Promise.resolve(url === '/bookings/calendar' ? [pendente] : {}));
    api.get.mockResolvedValue({ data: [] });
    render(<MemoryRouter initialEntries={['/admin/reservas/calendario']}><BookingCalendarPage /></MemoryRouter>);
  });

  it('a caixa vem marcada; desmarcada, o PUT leva notifyClient: false', async () => {
    const modal = await abrirModal();
    const caixa = within(modal).getByLabelText(LABEL);
    expect(caixa).toBeChecked();

    fireEvent.click(caixa);
    fireEvent.click(within(modal).getByRole('button', { name: 'Confirmar reserva' }));

    // Só a caixa importa aqui; o valor final é de outra decisão (D8a).
    expect(await corpoDoPut()).toMatchObject({ notifyClient: false });
  });

  it('marcada, o PUT sai como antes', async () => {
    const modal = await abrirModal();
    fireEvent.click(within(modal).getByRole('button', { name: 'Confirmar reserva' }));

    expect(await corpoDoPut()).not.toHaveProperty('notifyClient');
  });

  it('a caixa volta marcada a cada abertura do modal: desmarcar e cancelar não vale para a próxima', async () => {
    const primeiro = await abrirModal();
    fireEvent.click(within(primeiro).getByLabelText(LABEL));
    expect(within(primeiro).getByLabelText(LABEL)).not.toBeChecked();
    fireEvent.click(within(primeiro).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Confirmar reserva' })).not.toBeInTheDocument());

    const segundo = await abrirModal();
    expect(within(segundo).getByLabelText(LABEL)).toBeChecked();
    fireEvent.click(within(segundo).getByRole('button', { name: 'Confirmar reserva' }));

    expect(await corpoDoPut()).not.toHaveProperty('notifyClient');
  });
});
