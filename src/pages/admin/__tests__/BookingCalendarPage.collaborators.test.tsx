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
// addNotification estável: a busca da agenda é um useCallback que depende dele — um vi.fn() novo a
// cada render refaria a busca sem parar.
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/components/modals/ManualBookingModal', () => ({ ManualBookingModal: () => null }));
vi.mock('@/components/ui/BrandLoader', () => ({ BrandLoader: () => null, default: () => null }));
// O react-big-calendar mede o layout (o jsdom não tem medidas). No lugar dele, um botão por reserva
// que faz o mesmo que clicar no evento.
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

// Formato real de GET /collaborators (findMany com include user): o nome fica em user.name.
const collaborators = [
  { id: 'col-1', collaboratorRole: 'SOUND_TECHNICIAN', user: { name: 'Ana Souza', email: 'ana@t.com' } },
];
const bookings = [
  { id: 'XP-1', status: 'PENDING', eventDate: '2026-11-20T21:00:00.000Z', duration: 4, totalPrice: 800, client: { name: 'Cliente Teste' } },
];

const optionsOf = (select: HTMLElement) =>
  Array.from((select as HTMLSelectElement).options).map((o) => [o.value, o.textContent]);

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/reservas/calendario']}>
      <BookingCalendarPage />
    </MemoryRouter>,
  );

// A agenda do admin buscava GET /collaborators cru e lia `c.name`, que não existe (o nome vem em
// user.name): os dois seletores de colaborador mostravam opções em branco.
describe('BookingCalendarPage — nome dos colaboradores nos seletores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    // A mesma lista pelos dois caminhos (apiFetch e api.get): o teste falha pelo nome, não pelo mock.
    apiFetch.mockImplementation((url: string) =>
      Promise.resolve(url === '/bookings/calendar' ? bookings : url === '/collaborators' ? collaborators : {}),
    );
    api.get.mockImplementation((url: string) => Promise.resolve({ data: url === '/collaborators' ? collaborators : [] }));
  });

  it('"Filtrar por colaborador" mostra o nome (antes: opção em branco)', async () => {
    renderPage();
    const filtro = screen.getByLabelText('Filtrar por colaborador');
    await vi.waitFor(() => expect(optionsOf(filtro)).toEqual([['', 'Toda a equipe'], ['col-1', 'Ana Souza']]));
  });

  it('"Colaborador responsável" da confirmação mostra o nome', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Cliente Teste' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar reserva' }));
    const responsavel = await screen.findByLabelText('Colaborador responsável (opcional)');
    await vi.waitFor(() => expect(optionsOf(responsavel)).toEqual([['', 'Sem responsável'], ['col-1', 'Ana Souza']]));
  });
});
