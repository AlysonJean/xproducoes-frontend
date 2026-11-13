import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch, api } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  api: { get: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../../services/api', () => ({ apiFetch, api }));
vi.mock('@/services/api', () => ({ apiFetch, api }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('@/components/modals/ManualBookingModal', () => ({ ManualBookingModal: () => null }));
vi.mock('@/components/ui/BrandLoader', () => ({ BrandLoader: () => null, default: () => null }));
// Mesmo stub do react-big-calendar de BookingCalendarPage.d8a.test.tsx: um botão por reserva.
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

// Auditoria do orçamento (12/11/2026), O3: os detalhes da reserva na agenda do painel mostravam "R$ 0,00" no pedido
// do briefing (Intl direto, sem a regra do "Em preparação").
describe('BookingCalendarPage — total zero sai "Em preparação" (O3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: [] });
  });

  const abrir = async (totalPrice: number | string) => {
    apiFetch.mockImplementation((url: string) =>
      Promise.resolve(url === '/bookings/calendar'
        ? [{ id: 'XP-8', status: 'PENDING', eventDate: '2026-12-05T21:00:00.000Z', duration: 4, totalPrice, client: { name: 'Cliente Briefing' } }]
        : {}),
    );
    render(
      <MemoryRouter initialEntries={['/admin/reservas/calendario']}>
        <BookingCalendarPage />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Cliente Briefing' }));
  };

  it('pedido sem valor: "Em preparação", sem "R$ 0,00"', async () => {
    await abrir(0);

    expect(await screen.findByText('Em preparação')).toBeInTheDocument();
    expect(screen.queryByText(/R\$\s*0,00/)).not.toBeInTheDocument();
  });

  it('valor que chega como texto ("750.00"): o total, não "Em preparação"', async () => {
    await abrir('750.00');

    expect(await screen.findByText(/750,00/)).toBeInTheDocument();
    expect(screen.queryByText('Em preparação')).not.toBeInTheDocument();
  });
});
