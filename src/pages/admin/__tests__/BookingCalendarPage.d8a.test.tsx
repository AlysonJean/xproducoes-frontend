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
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/components/modals/ManualBookingModal', () => ({ ManualBookingModal: () => null }));
vi.mock('@/components/ui/BrandLoader', () => ({ BrandLoader: () => null, default: () => null }));
// Mesmo stub do react-big-calendar de confirmOnce.BookingCalendarPage.test.tsx: um botão por reserva.
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

// D8a (aprovada em 02/11/2026): a agenda mostrava "serviceValue || totalPrice" — o "Valor do Serviço" quando
// existia —, enquanto os PDFs, o WhatsApp e a página do cliente usavam o totalPrice. Agora só o totalPrice.
describe('BookingCalendarPage — o valor da reserva é o totalPrice (D8a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    api.get.mockResolvedValue({ data: [] });
    apiFetch.mockImplementation((url: string) =>
      Promise.resolve(url === '/bookings/calendar'
        ? [{ id: 'XP-7', status: 'PENDING', eventDate: '2026-12-05T21:00:00.000Z', duration: 4, serviceValue: 1800, totalPrice: 750, client: { name: 'Cliente Teste' } }]
        : {}),
    );
  });

  it('detalhes da reserva: R$ 750,00, não o serviceValue de R$ 1.800,00', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/reservas/calendario']}>
        <BookingCalendarPage />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Cliente Teste' }));

    expect(await screen.findByText(/750,00/)).toBeInTheDocument();
    expect(screen.queryByText(/1\.800,00/)).not.toBeInTheDocument();
  });
});
