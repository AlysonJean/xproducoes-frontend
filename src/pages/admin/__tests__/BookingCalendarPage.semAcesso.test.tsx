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
// O react-big-calendar mede o layout (o jsdom não tem medidas). No lugar dele, um botão por reserva.
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

// Decisão de Alyson (12/11/2026): quem está com o acesso desativado não aparece para escalar ("Colaborador
// responsável" da confirmação). O filtro "Toda a equipe" continua com todos: as reservas antigas dessa pessoa são
// histórico e seguem filtráveis.
const collaborators = [
  { id: 'col-1', collaboratorRole: 'DJ', status: 'ACTIVE', user: { name: 'Ana Souza', email: 'ana@t.com', isActive: true } },
  { id: 'col-2', collaboratorRole: 'DJ', status: 'INACTIVE', user: { name: 'Edu Nunes', email: 'edu@t.com', isActive: false } },
  { id: 'col-3', collaboratorRole: 'DJ', status: 'ACTIVE', user: { name: 'Usuário removido', email: 'r@t.com', isActive: false } },
];
const bookings = [
  { id: 'XP-1', status: 'PENDING', eventDate: '2026-11-20T21:00:00.000Z', duration: 4, totalPrice: 800, client: { name: 'Cliente Teste' } },
];
const optionsOf = (select: HTMLElement) => Array.from((select as HTMLSelectElement).options).map((o) => o.textContent);

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/reservas/calendario']}>
      <BookingCalendarPage />
    </MemoryRouter>,
  );

describe('BookingCalendarPage — quem está sem acesso não aparece para escalar (decisão de 12/11/2026)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    apiFetch.mockImplementation((url: string) =>
      Promise.resolve(url === '/bookings/calendar' ? bookings : url === '/collaborators' ? collaborators : {}),
    );
    api.get.mockImplementation((url: string) => Promise.resolve({ data: url === '/collaborators' ? collaborators : [] }));
  });

  it('"Colaborador responsável" da confirmação: só quem tem acesso', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Cliente Teste' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar reserva' }));
    const responsavel = await screen.findByLabelText('Colaborador responsável (opcional)');
    await vi.waitFor(() => expect(optionsOf(responsavel)).toEqual(['Sem responsável', 'Ana Souza']));
  });

  it('"Filtrar por colaborador" continua com toda a equipe (histórico)', async () => {
    renderPage();
    const filtro = screen.getByLabelText('Filtrar por colaborador');
    await vi.waitFor(() => expect(optionsOf(filtro)).toEqual(['Toda a equipe', 'Ana Souza', 'Edu Nunes', 'Usuário removido']));
  });
});
