import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch, api, useAuth, addNotification } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  api: { get: vi.fn(), delete: vi.fn() },
  useAuth: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('../../../services/api', () => ({ apiFetch, api }));
vi.mock('@/services/api', () => ({ apiFetch, api }));
// addNotification estável: a busca da agenda é um useCallback que depende dele.
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/components/modals/ManualBookingModal', () => ({ ManualBookingModal: () => null }));
vi.mock('@/components/ui/BrandLoader', () => ({ BrandLoader: () => null, default: () => null }));
// O react-big-calendar mede o layout (o jsdom não tem medidas). No lugar dele, um botão por reserva
// que faz o mesmo que clicar no evento (mesmo stub de BookingCalendarPage.collaborators.test.tsx).
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

import BookingCalendarPage from '../BookingCalendarPage';

// Reserva pendente lançada pelo admin com "Valor do serviço" (serviceValue) preenchido, no formato de
// GET /bookings/calendar.
const pendingBooking = (totalPrice: number) => ({
  id: 'XP-7',
  status: 'PENDING',
  eventDate: '2026-12-05T21:00:00.000Z',
  duration: 4,
  serviceValue: 1800,
  totalPrice,
  client: { name: 'Cliente Teste' },
});

// Abre a reserva na agenda, clica em "Confirmar reserva" e devolve o campo "Valor final".
const openConfirmModal = async () => {
  render(
    <MemoryRouter initialEntries={['/admin/reservas/calendario']}>
      <BookingCalendarPage />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Cliente Teste' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar reserva' }));
  return (await screen.findByLabelText('Valor final (R$)')) as HTMLInputElement;
};

// Corpo do PUT /bookings/XP-7/confirm-details depois de confirmar no modal.
const submitAndReadBody = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));
  await vi.waitFor(() =>
    expect(apiFetch).toHaveBeenCalledWith('/bookings/XP-7/confirm-details', expect.objectContaining({ method: 'PUT' })),
  );
  const [, init] = apiFetch.mock.calls.find(([url]) => url === '/bookings/XP-7/confirm-details')!;
  return JSON.parse(init.body);
};

// Achado (auditoria ponta a ponta): a confirmação pela agenda preenchia o "Valor final" com o
// serviceValue e o confirm-details o gravava como totalPrice. Confirmar sem mexer no campo trocava o
// preço de 750 para 1800, e a página do cliente ainda somava o serviceValue de novo (R$ 3.600).
describe('BookingCalendarPage — confirmar pela agenda não troca o preço da reserva', () => {
  let bookings: ReturnType<typeof pendingBooking>[];

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    apiFetch.mockImplementation((url: string) => Promise.resolve(url === '/bookings/calendar' ? bookings : {}));
    api.get.mockResolvedValue({ data: [] });
  });

  it('"Valor final" vem do total da reserva (750), não do valor do serviço (1800), e é o que vai no PUT', async () => {
    bookings = [pendingBooking(750)];

    const valorFinal = await openConfirmModal();
    expect(valorFinal.value).toBe('750');

    expect(await submitAndReadBody()).toEqual({ totalPrice: 750 });
  });

  it('reserva ainda sem total: o campo fica vazio e o PUT não leva totalPrice (o preço não muda sozinho)', async () => {
    bookings = [pendingBooking(0)];

    const valorFinal = await openConfirmModal();
    expect(valorFinal.value).toBe('');

    expect(await submitAndReadBody()).toEqual({});
  });
});
