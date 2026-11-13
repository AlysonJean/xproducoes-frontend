import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
// No lugar do react-big-calendar (que mede o layout), um botão para abrir cada reserva e outros dois que fazem o que
// arrastar e esticar fazem: chamam onEventDrop e onEventResize com o início e o término novos.
type StubEvent = { title: string; start?: Date; resource: { id: string } };
type Move = (args: { event: StubEvent; start: Date; end: Date }) => void;
const NOVO_INICIO = new Date('2026-12-06T22:00:00.000Z');
const NOVO_FIM = new Date('2026-12-07T05:00:00.000Z');
vi.mock('react-big-calendar', () => ({
  Calendar: () => null,
  dateFnsLocalizer: () => ({}),
  Views: { MONTH: 'month', WEEK: 'week', DAY: 'day', AGENDA: 'agenda' },
}));
vi.mock('react-big-calendar/lib/addons/dragAndDrop', () => ({
  default: () => ({ events, onSelectEvent, onEventDrop, onEventResize }: { events: StubEvent[]; onSelectEvent: (event: StubEvent) => void; onEventDrop: Move; onEventResize: Move }) => (
    <div>
      {events.map((event) => (
        <div key={event.resource.id}>
          <button type="button" onClick={() => onSelectEvent(event)}>{event.title}</button>
          <span>{`início ${event.resource.id}: ${event.start ? new Date(event.start).toISOString() : ''}`}</span>
          <button type="button" onClick={() => onEventDrop({ event, start: NOVO_INICIO, end: NOVO_FIM })}>Arrastar {event.title}</button>
          <button type="button" onClick={() => onEventResize({ event, start: NOVO_INICIO, end: NOVO_FIM })}>Esticar {event.title}</button>
        </div>
      ))}
    </div>
  ),
}));

import BookingCalendarPage from '../BookingCalendarPage';

// Auditoria do orçamento (12/11/2026), O1/A1/C1: arrastar ou esticar uma reserva na agenda mandava `duration` (que a
// validação descartava), não refazia o valor, não avisava quando o valor mudava e dizia só "Não foi possível alterar a
// data" quando o servidor recusava (conflito de equipamento de uma reserva confirmada, término antes do início).
const reserva = { id: 'XP-7', status: 'CONFIRMED', eventDate: '2026-12-05T21:00:00.000Z', eventEndDate: '2026-12-06T02:00:00.000Z', duration: 5, totalPrice: 1300, client: { name: 'Cliente Teste' } };
let putResult: () => Promise<unknown>;

const abrirAgenda = async () => {
  render(
    <MemoryRouter initialEntries={['/admin/reservas/calendario']}>
      <BookingCalendarPage />
    </MemoryRouter>,
  );
  await screen.findByRole('button', { name: 'Cliente Teste' });
};
const corpoDoPut = () => {
  const call = apiFetch.mock.calls.find(([url, init]) => url === '/bookings/XP-7' && init?.method === 'PUT');
  return call ? JSON.parse(call[1].body as string) : null;
};

describe('BookingCalendarPage — arrastar e esticar refazem o valor no servidor e avisam (O1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    api.get.mockResolvedValue({ data: [] });
    putResult = () => Promise.resolve({
      id: 'XP-7', totalPrice: '1500.00', eventDuration: 7,
      recalculation: { message: 'Valor da reserva: de R$ 1.300,00 para R$ 1.500,00.' },
    });
    apiFetch.mockImplementation((url: string, init?: { method?: string }) => {
      if (url === '/bookings/calendar') return Promise.resolve([reserva]);
      if (url === '/bookings/XP-7' && init?.method === 'PUT') return putResult();
      return Promise.resolve({});
    });
  });

  it('arrastar manda só o início e o término (sem duration), avisa o valor novo e a agenda passa a mostrá-lo', async () => {
    await abrirAgenda();
    fireEvent.click(screen.getByRole('button', { name: 'Arrastar Cliente Teste' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith({ type: 'info', title: 'Valor da reserva', message: 'Valor da reserva: de R$ 1.300,00 para R$ 1.500,00.' }));
    expect(corpoDoPut()).toEqual({ eventDate: NOVO_INICIO.toISOString(), eventEndDate: NOVO_FIM.toISOString() });
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Horário alterado' }));
    expect(screen.getByText(`início XP-7: ${NOVO_INICIO.toISOString()}`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cliente Teste' }));
    expect(await screen.findByText(/1\.500,00/)).toBeInTheDocument();
  });

  it('esticar também: o mesmo corpo e o mesmo aviso', async () => {
    await abrirAgenda();
    fireEvent.click(screen.getByRole('button', { name: 'Esticar Cliente Teste' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'info', title: 'Valor da reserva' })));
    expect(corpoDoPut()).toEqual({ eventDate: NOVO_INICIO.toISOString(), eventEndDate: NOVO_FIM.toISOString() });
  });

  it('servidor recusa (conflito de equipamento da reserva confirmada): o motivo aparece e o evento volta', async () => {
    putResult = () => Promise.reject(new Error('Não é possível mudar a data: equipamento(s) já reservado(s) para outro evento confirmado no mesmo período: "Casamento Silva" em 06/12/2026.'));
    await abrirAgenda();
    fireEvent.click(screen.getByRole('button', { name: 'Arrastar Cliente Teste' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith({
      type: 'error',
      title: 'Erro ao mover',
      message: 'Não é possível mudar a data: equipamento(s) já reservado(s) para outro evento confirmado no mesmo período: "Casamento Silva" em 06/12/2026.',
    }));
    expect(addNotification).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
    // O evento volta para onde estava.
    await waitFor(() => expect(screen.getByText('início XP-7: 2026-12-05T21:00:00.000Z')).toBeInTheDocument());
  });
});

// Auditoria do orçamento (12/11/2026), O33: "Confirmar reserva" com valor final zero ou negativo. O servidor recusa com a
// mensagem genérica da validação ("Dados de entrada inválidos"); a agenda para antes, com o motivo. O campo diz que é o
// total, com o frete (no "Editar" é o valor dos itens, sem o frete).
describe('BookingCalendarPage — "Confirmar reserva" com valor final zero ou negativo (O33)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    api.get.mockResolvedValue({ data: [] });
    apiFetch.mockImplementation((url: string) => Promise.resolve(url === '/bookings/calendar' ? [{ ...reserva, status: 'PENDING' }] : {}));
  });

  it.each(['0', '-50'])('valor final %s: aviso com o motivo, nada enviado', async (valor) => {
    await abrirAgenda();
    fireEvent.click(screen.getByRole('button', { name: 'Cliente Teste' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar reserva' }));
    expect(screen.getByText('O total da reserva, com frete e pedágio. Em branco, fica o valor de hoje.')).toBeInTheDocument();

    fireEvent.change(await screen.findByLabelText('Valor final (R$)'), { target: { value: valor } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith({
      type: 'error',
      title: 'Valor final inválido',
      message: 'O valor final precisa ser maior que zero. Em branco, fica o valor de hoje.',
    }));
    expect(apiFetch).not.toHaveBeenCalledWith('/bookings/XP-7/confirm-details', expect.anything());
  });
});
