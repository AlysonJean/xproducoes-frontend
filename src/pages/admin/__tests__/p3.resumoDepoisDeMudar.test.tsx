import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { apiFetch, api, bookingAPI, useAuth, addNotification } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  bookingAPI: {
    getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn(),
    sendProposal: vi.fn(), getAuditHistory: vi.fn(),
  },
  useAuth: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('xlsx-js-style', () => ({ default: {} }));
vi.mock('../../../services/api', () => ({ apiFetch, api, bookingAPI }));
vi.mock('@/services/api', () => ({ apiFetch, api, bookingAPI }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
// O formulário de reserva de verdade não importa aqui: só o "salvou" (onSuccess).
vi.mock('@/components/forms/AdminBookingForm', () => ({
  AdminBookingForm: ({ onSuccess }: { onSuccess?: () => void }) => <button type="button" onClick={() => onSuccess?.()}>Salvar formulário</button>,
}));
vi.mock('@/components/modals/ManualBookingModal', () => ({ ManualBookingModal: () => null }));
vi.mock('@/hooks/useCollaborators', () => ({ useCollaborators: () => ({ collaborators: [], fetchCollaborators: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/components/bookings/BookingCollaborators', () => ({ BookingCollaborators: () => null }));
vi.mock('@/components/bookings/BookingFinancialSummary', () => ({ BookingFinancialSummary: () => null }));
// A janela "Gerenciar Colaboradores" de verdade não importa aqui: só o "Salvar" (o mesmo stub de d11b.fichaAvisarCliente).
vi.mock('../../../components/modals/EventManagement', () => ({
  EventManagement: ({ onSave }: { onSave: (assignments: unknown[]) => void }) => (
    <div role="dialog" aria-label="Gerenciar Colaboradores">
      <button type="button" onClick={() => onSave([{ id: 'a-c1', collaboratorId: 'c1', role: 'DJ', estimatedHours: 4, hourlyRate: null }])}>
        Salvar equipe da janela
      </button>
    </div>
  ),
}));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
vi.mock('jspdf', () => ({ jsPDF: class {} }));
// O react-big-calendar mede o layout (o jsdom não tem medidas): no lugar dele, um botão por reserva (o mesmo stub de
// d11b.listaEAgendaAvisarCliente.test.tsx).
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
import BookingDetailPage from '../BookingDetailPage';
import { ContactSubmissionsListPage } from '../ContactSubmissionsListPage';
import { resetAdminSummaryForTests } from '../../../stores/adminSummary';

// P3 (aprovada em 02/11/2026): o número do menu e o cartão do painel consultam no máximo uma vez por minuto, mas
// depois de o admin mudar uma reserva ou um contato no painel o resumo é pedido na hora (refresh({ force: true })),
// mesmo dentro do minuto: mudar o status na lista, confirmar ou enviar a proposta na ficha, confirmar pela agenda,
// marcar como lida ou apagar uma mensagem. O menu (AdminLayout de verdade) pede a primeira consulta ao montar.

const RESUMO = { waitingRequests: 1, oldestWaitingAt: '2026-11-10T10:00:00.000Z', pastEventRequests: 0, proposalsAwaitingClient: 0, unreadContacts: 1 };
const resumos = () => apiFetch.mock.calls.filter(([url]) => url === '/dashboard/summary').length;
const metodo = (m: string) => apiFetch.mock.calls.filter(([, init]) => init?.method === m);

const linha = {
  id: 'XP-1', status: 'PENDING', deliveryStatus: 'PENDING', totalPrice: '900', eventDate: '2027-12-21T01:00:00.000Z',
  createdAt: '2026-11-09T12:00:00.000Z', creator: { role: 'CLIENT' }, proposalSent: false,
  clientName: 'Bruno Lima', clientContact: '31977776666', clientEmail: 'bruno@cliente.test', client: null,
};
const contatos = [{ id: 'c1', name: 'Ana Souza', email: 'ana@teste.com', message: 'Quero som.', isRead: false, createdAt: '2026-10-30T12:00:00.000Z' }];
const naAgenda = { id: 'XP-7', status: 'PENDING', eventDate: '2027-12-05T21:00:00.000Z', duration: 4, totalPrice: 750, client: { name: 'Cliente Teste' } };
const naFicha = {
  id: 'XP-ANA-20271220', status: 'PENDING', deliveryStatus: 'PENDING', totalPrice: '900', eventTitle: 'Formatura da Ana',
  eventDate: '2027-12-21T01:00:00.000Z', eventEndDate: '2027-12-21T05:00:00.000Z', location: 'Espaço VIP', clientId: null, client: null,
  clientName: 'Ana Souza', clientContact: '(31) 98888-7777', clientEmail: 'ana@cliente.test',
  attachments: [], equipments: [], services: [], eventCollaborators: [],
};

let falharMudancas = false;
const backend = (url: string, init?: { method?: string }) => {
  const m = init?.method ?? 'GET';
  if (m !== 'GET') return falharMudancas ? Promise.reject(new Error('500')) : Promise.resolve(url.endsWith('/read') ? { ...contatos[0], isRead: true } : {});
  if (url === '/dashboard/summary') return Promise.resolve(RESUMO);
  if (url.startsWith('/admin/bookings?page=1')) return Promise.resolve([linha]);
  if (url === '/admin/contacts') return Promise.resolve(contatos);
  if (url === '/bookings/calendar') return Promise.resolve([naAgenda]);
  return Promise.resolve([]);
};

const menuMontado = () => waitFor(() => expect(resumos()).toBe(1));

describe('P3 — o resumo do painel é pedido de novo logo depois de cada mudança', () => {
  let open: MockInstance<typeof window.open>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetAdminSummaryForTests();
    falharMudancas = false;
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    apiFetch.mockImplementation(backend);
    api.get.mockResolvedValue({ data: [] });
    bookingAPI.getById.mockResolvedValue({ data: naFicha });
    bookingAPI.confirmWithDetails.mockResolvedValue({});
    bookingAPI.updateStatus.mockResolvedValue({});
    bookingAPI.updateDeliveryStatus.mockResolvedValue({});
    bookingAPI.delete.mockResolvedValue({});
    bookingAPI.getAuditHistory.mockResolvedValue({ data: [] });
    bookingAPI.sendProposal.mockResolvedValue({ data: { link: 'https://www.xproducoeseeventos.com.br/proposta#token=p1.T', expiresAt: '2027-12-15T02:59:59.999Z', email: { status: 'queued' } } });
    open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
  });
  afterEach(() => {
    open.mockRestore();
  });

  it('lista de Reservas: mudar o status consulta na hora; mudar a entrega, não', async () => {
    render(<MemoryRouter initialEntries={['/admin/reservas']}><BookingListPage /></MemoryRouter>);
    await screen.findByLabelText('Status da reserva XP-1');
    await menuMontado();

    fireEvent.change(screen.getByLabelText('Entrega da reserva XP-1'), { target: { value: 'PREPARING' } });
    await waitFor(() => expect(metodo('PATCH')).toHaveLength(1));
    await waitFor(() => expect(addNotification).toHaveBeenCalledTimes(1));
    expect(resumos()).toBe(1);

    fireEvent.change(screen.getByLabelText('Status da reserva XP-1'), { target: { value: 'CANCELLED' } });
    await waitFor(() => expect(metodo('PATCH')).toHaveLength(2));
    await waitFor(() => expect(resumos()).toBe(2));
  });

  it('lista de Reservas: salvar o formulário (nova reserva ou edição) consulta na hora', async () => {
    render(<MemoryRouter initialEntries={['/admin/reservas']}><BookingListPage /></MemoryRouter>);
    await screen.findByLabelText('Status da reserva XP-1');
    await menuMontado();

    fireEvent.click(screen.getByRole('button', { name: 'Editar reserva XP-1' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar formulário' }));
    await waitFor(() => expect(resumos()).toBe(2));
  });

  it('lista de Reservas: mudança que falha não consulta', async () => {
    falharMudancas = true;
    render(<MemoryRouter initialEntries={['/admin/reservas']}><BookingListPage /></MemoryRouter>);
    await screen.findByLabelText('Status da reserva XP-1');
    await menuMontado();

    fireEvent.change(screen.getByLabelText('Status da reserva XP-1'), { target: { value: 'CANCELLED' } });
    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' })));
    expect(resumos()).toBe(1);
  });

  it('agenda: confirmar pelo modal consulta na hora', async () => {
    render(<MemoryRouter initialEntries={['/admin/reservas/calendario']}><BookingCalendarPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Cliente Teste' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar reserva' }));
    const modal = await screen.findByRole('dialog', { name: 'Confirmar reserva' });
    await menuMontado();

    fireEvent.click(within(modal).getByRole('button', { name: 'Confirmar reserva' }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/bookings/XP-7/confirm-details', expect.objectContaining({ method: 'PUT' })));
    await waitFor(() => expect(resumos()).toBe(2));
  });

  it('contatos: marcar como lida e apagar consultam na hora', async () => {
    render(<MemoryRouter initialEntries={['/admin/contatos']}><ContactSubmissionsListPage /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Ana Souza' });
    await menuMontado();

    fireEvent.click(screen.getByRole('button', { name: /marcar lida/i }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/contacts/c1/read', { method: 'PATCH' }));
    await waitFor(() => expect(resumos()).toBe(2));

    fireEvent.click(screen.getByRole('button', { name: /excluir/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar Exclusão' }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/contacts/c1', { method: 'DELETE' }));
    await waitFor(() => expect(resumos()).toBe(3));
  });

  const abrirFicha = async () => {
    render(
      <MemoryRouter initialEntries={['/admin/reservas/XP']}>
        <Routes><Route path="/admin/reservas/:id" element={<BookingDetailPage />} /></Routes>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: /^Reserva / });
    await menuMontado();
  };

  it('ficha da reserva: enviar a proposta consulta na hora (o pedido já foi respondido)', async () => {
    await abrirFicha();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }));
    await screen.findByRole('dialog', { name: 'Proposta enviada' });
    await waitFor(() => expect(resumos()).toBe(2));
  });

  it('ficha da reserva: confirmar pelo modal consulta na hora', async () => {
    await abrirFicha();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));
    const modal = await screen.findByRole('dialog', { name: 'Confirmar reserva' });
    fireEvent.click(within(modal).getByRole('button', { name: 'Confirmar reserva' }));
    await waitFor(() => expect(bookingAPI.confirmWithDetails).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(resumos()).toBe(2));
  });

  it('ficha da reserva: cancelar consulta na hora; "equipe a caminho" (entrega) não', async () => {
    await abrirFicha();

    fireEvent.click(screen.getByRole('button', { name: 'Avisar: equipe a caminho' }));
    const caminho = await screen.findByRole('dialog', { name: 'Equipe a caminho?' });
    fireEvent.click(within(caminho).getByRole('button', { name: 'Marcar a caminho' }));
    await waitFor(() => expect(bookingAPI.updateDeliveryStatus).toHaveBeenCalledWith(naFicha.id, 'ON_THE_WAY'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Equipe a caminho?' })).toBeNull());
    expect(resumos()).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    const cancelar = await screen.findByRole('dialog', { name: 'Cancelar a reserva?' });
    fireEvent.click(within(cancelar).getByRole('button', { name: 'Cancelar reserva' }));
    await waitFor(() => expect(bookingAPI.updateStatus).toHaveBeenCalledWith(naFicha.id, 'CANCELLED', undefined));
    await waitFor(() => expect(resumos()).toBe(2));
  });

  it('ficha da reserva: "Alocar equipe e confirmar" consulta na hora', async () => {
    await abrirFicha();

    fireEvent.click(screen.getByRole('button', { name: 'Alocar equipe e confirmar' }));
    const janela = await screen.findByRole('dialog', { name: 'Gerenciar Colaboradores' });
    fireEvent.click(within(janela).getByRole('button', { name: 'Salvar equipe da janela' }));
    await waitFor(() => expect(bookingAPI.confirmWithDetails).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(resumos()).toBe(2));
  });

  it('ficha da reserva: excluir consulta na hora (antes de voltar à lista)', async () => {
    await abrirFicha();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    const excluir = await screen.findByRole('dialog', { name: 'Excluir reserva?' });
    fireEvent.click(within(excluir).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(bookingAPI.delete).toHaveBeenCalledWith(naFicha.id));
    await waitFor(() => expect(resumos()).toBe(2));
  });
});
