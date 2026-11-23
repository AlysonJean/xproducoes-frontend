import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Onda 2 da auditoria de 19/11: F6P1-02/B5-06 (a agenda carregava todas as reservas de todos os anos a cada abertura) e
// F6P1-06 (arrastar ou esticar mudava data e valor de qualquer reserva, sem confirmação).
const { apiFetch, api, useAuth, addNotification } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  api: { get: vi.fn(), delete: vi.fn() },
  useAuth: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('../../../services/api', () => ({ apiFetch, api }));
vi.mock('@/services/api', () => ({ apiFetch, api }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/components/modals/ManualBookingModal', () => ({ ManualBookingModal: () => null }));
vi.mock('@/components/ui/BrandLoader', () => ({ BrandLoader: () => null, default: () => null }));

type StubEvent = { title: string; start?: Date; resource: { id: string; status?: string } };
type Move = (args: { event: StubEvent; start: Date; end: Date }) => void;
const NOVO_INICIO = new Date(2026, 11, 6, 19, 0);
const NOVO_FIM = new Date(2026, 11, 7, 2, 0);
vi.mock('react-big-calendar', () => ({
  Calendar: () => null,
  dateFnsLocalizer: () => ({}),
  Views: { MONTH: 'month', WEEK: 'week', DAY: 'day', AGENDA: 'agenda' },
}));
vi.mock('react-big-calendar/lib/addons/dragAndDrop', () => ({
  default: () => ({ events, onEventDrop, draggableAccessor, resizableAccessor }: {
    events: StubEvent[]; onEventDrop: Move; draggableAccessor?: (e: StubEvent) => boolean; resizableAccessor?: (e: StubEvent) => boolean;
  }) => (
    <div>
      {events.map((event) => (
        <div key={event.resource.id}>
          <span>{`${event.resource.id}: ${draggableAccessor?.(event) !== false && resizableAccessor?.(event) !== false ? 'pode mover' : 'travada'}`}</span>
          <button type="button" onClick={() => onEventDrop({ event, start: NOVO_INICIO, end: NOVO_FIM })}>Arrastar {event.title}</button>
        </div>
      ))}
    </div>
  ),
}));

import BookingCalendarPage from '../BookingCalendarPage';

const reserva = (id: string, status: string, nome: string, inicio = new Date(2026, 11, 5, 18, 0)) => ({
  id, status, eventDate: inicio.toISOString(), eventEndDate: new Date(inicio.getTime() + 5 * 3600000).toISOString(),
  duration: 5, totalPrice: 1300, client: { name: nome },
});
let reservas: ReturnType<typeof reserva>[] = [];
const urlsDaAgenda = () => apiFetch.mock.calls.map(([url]) => String(url)).filter((url) => url.startsWith('/bookings/calendar'));
const put = () => apiFetch.mock.calls.find(([url, init]) => String(url).startsWith('/bookings/XP-') && init?.method === 'PUT');

const abrir = async () => {
  render(<MemoryRouter initialEntries={['/admin/reservas/calendario']}><BookingCalendarPage /></MemoryRouter>);
  await waitFor(() => expect(urlsDaAgenda().length).toBeGreaterThan(0));
};

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(2026, 11, 10, 12, 0), shouldAdvanceTime: true });
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  api.get.mockResolvedValue({ data: [] });
  reservas = [];
  apiFetch.mockImplementation((url: string, init?: { method?: string }) => {
    if (url.startsWith('/bookings/calendar?')) return Promise.resolve(reservas);
    if (url.startsWith('/bookings/XP-') && init?.method === 'PUT') return Promise.resolve({ id: url.split('/').pop() });
    return Promise.resolve({});
  });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Agenda — período visível (F6P1-02/B5-06)', () => {
  it('pede só do mês anterior ao seguinte do mês na tela, e pede de novo ao trocar de mês', async () => {
    await abrir();
    const primeira = new URL(urlsDaAgenda()[0], 'http://x').searchParams;
    expect(primeira.get('from')).toBe(new Date(2026, 10, 1).toISOString());
    expect(primeira.get('to')).toBe(new Date(2027, 1, 1).toISOString());

    fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    await waitFor(() => expect(urlsDaAgenda().length).toBe(2));
    const segunda = new URL(urlsDaAgenda()[1], 'http://x').searchParams;
    expect(segunda.get('from')).toBe(new Date(2026, 11, 1).toISOString());
    expect(segunda.get('to')).toBe(new Date(2027, 2, 1).toISOString());
  });

  it('os números do cabeçalho são do mês na tela', async () => {
    reservas = [
      reserva('XP-1', 'CONFIRMED', 'Dezembro A'),
      reserva('XP-2', 'CONFIRMED', 'Dezembro B', new Date(2026, 11, 20, 18, 0)),
      reserva('XP-3', 'CONFIRMED', 'Novembro', new Date(2026, 10, 20, 18, 0)),
    ];
    await abrir();
    await screen.findByText('XP-1: pode mover');
    const confirmadas = screen.getByText(/Confirmadas/).parentElement as HTMLElement;
    expect(confirmadas.textContent).toMatch(/2$/);
  });
});

describe('Agenda — mudar a data arrastando (F6P1-06)', () => {
  it('reserva confirmada: pede confirmação com de → para; "Manter como está" não grava', async () => {
    reservas = [reserva('XP-1', 'CONFIRMED', 'Ana Souza')];
    await abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Arrastar Ana Souza' }));

    expect(await screen.findByText('Mudar a data da reserva?')).toBeInTheDocument();
    expect(screen.getByText(/^De: 05\/12\/2026 às 18:00/)).toBeInTheDocument();
    expect(screen.getByText(/^Para: 06\/12\/2026 às 19:00/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Manter como está' }));
    expect(put()).toBeUndefined();
  });

  it('reserva confirmada: "Mudar" grava a data nova', async () => {
    reservas = [reserva('XP-1', 'CONFIRMED', 'Ana Souza')];
    await abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Arrastar Ana Souza' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mudar' }));
    await waitFor(() => expect(put()).toBeDefined());
    expect(JSON.parse(put()![1].body as string)).toEqual({ eventDate: NOVO_INICIO.toISOString(), eventEndDate: NOVO_FIM.toISOString() });
  });

  it('pedido pendente: muda na hora, sem a janela', async () => {
    reservas = [reserva('XP-2', 'PENDING', 'Bia Lima')];
    await abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Arrastar Bia Lima' }));
    await waitFor(() => expect(put()).toBeDefined());
    expect(screen.queryByText('Mudar a data da reserva?')).not.toBeInTheDocument();
  });

  it('reserva encerrada (concluída, cancelada, reembolsada) não arrasta nem estica', async () => {
    reservas = [
      reserva('XP-3', 'COMPLETED', 'Concluída'),
      reserva('XP-4', 'REFUNDED', 'Reembolsada'),
      reserva('XP-5', 'CONFIRMED', 'Confirmada'),
    ];
    await abrir();
    expect(await screen.findByText('XP-3: travada')).toBeInTheDocument();
    expect(screen.getByText('XP-4: travada')).toBeInTheDocument();
    expect(screen.getByText('XP-5: pode mover')).toBeInTheDocument();
  });
});
