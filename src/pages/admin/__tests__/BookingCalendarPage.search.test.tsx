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

// Achado (auditoria, item B de 05/11/2026): a busca da agenda procurava em `internalNotes`, que a API
// preenchia com `notes`. Desde a Proposta Rápida gravar a observação interna em internalNotes (d3fe9fc),
// a observação interna nova não era achada. A API agora manda as duas (internalNotes e notes, rota só de
// admin) e a busca procura nas duas: acha a observação interna nova e o texto das reservas antigas.
const reserva = (id: string, nome: string, extra: Record<string, unknown>) => ({
  id,
  status: 'CONFIRMED',
  eventDate: '2026-12-05T21:00:00.000Z',
  duration: 4,
  totalPrice: 500,
  client: { name: nome },
  ...extra,
});

describe('BookingCalendarPage — busca na observação interna e na observação antiga', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    api.get.mockResolvedValue({ data: [] });
    apiFetch.mockImplementation((url: string) =>
      Promise.resolve(
        url === '/bookings/calendar'
          ? [
              reserva('XP-1', 'Cliente Nova', { internalNotes: 'negociar o frete', notes: 'levar extensão' }),
              reserva('XP-2', 'Cliente Antiga', { internalNotes: null, notes: 'pediu desconto no frete' }),
              reserva('XP-3', 'Cliente Sem Nota', {}),
            ]
          : {},
      ),
    );
  });

  const buscar = async (texto: string) => {
    render(
      <MemoryRouter initialEntries={['/admin/reservas/calendario']}>
        <BookingCalendarPage />
      </MemoryRouter>,
    );
    await screen.findByRole('button', { name: 'Cliente Sem Nota' });
    fireEvent.change(screen.getByLabelText('Buscar reservas'), { target: { value: texto } });
  };

  it('acha a observação interna gravada pela Proposta Rápida', async () => {
    await buscar('negociar');
    expect(screen.getByRole('button', { name: 'Cliente Nova' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cliente Antiga' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cliente Sem Nota' })).toBeNull();
  });

  it('continua achando o texto das reservas antigas, que fica em notes', async () => {
    await buscar('desconto');
    expect(screen.getByRole('button', { name: 'Cliente Antiga' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cliente Nova' })).toBeNull();
  });

  it('a mesma palavra nas duas observações acha as duas reservas', async () => {
    await buscar('frete');
    expect(screen.getByRole('button', { name: 'Cliente Nova' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cliente Antiga' })).toBeInTheDocument();
  });
});
