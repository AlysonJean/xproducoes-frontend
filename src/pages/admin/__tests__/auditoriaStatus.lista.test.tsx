import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch, api, useAuth, addNotification } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  useAuth: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('xlsx-js-style', () => ({ default: {} }));
vi.mock('../../../services/api', () => ({ apiFetch, api }));
vi.mock('@/services/api', () => ({ apiFetch, api }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import BookingListPage from '../BookingListPage';
import { resetAdminSummaryForTests } from '../../../stores/adminSummary';

// Auditoria do status da reserva (21/11/2026), na lista de Reservas:
// - C3: o seletor de status de cada linha oferecia os 7 status; agora só o atual e as trocas que valem a partir dele
//   (a mesma tabela do servidor). "Concluída" e "Cancelada" gravavam num clique; agora perguntam antes.
// - C7: cancelar pede o motivo e vai pela rota de cancelar (PUT /bookings/:id/cancel), que grava a linha nas observações
//   internas e quem cancelou no Histórico.
// - B1: a entrega de uma reserva cancelada não muda.

const linha = (status: string, id = 'XP-1') => ({
  id, status, deliveryStatus: 'PENDING', totalPrice: '900', eventDate: '2027-12-21T01:00:00.000Z',
  createdAt: '2026-11-09T12:00:00.000Z', creator: { role: 'CLIENT' }, proposalSent: false,
  clientName: 'Bruno Lima', clientContact: '31977776666', clientEmail: 'bruno@cliente.test', client: null,
});
let linhas: ReturnType<typeof linha>[] = [];
const backend = (url: string, init?: { method?: string }) => {
  if (init?.method === 'PUT' && url.endsWith('/cancel')) {
    const id = url.split('/')[2];
    linhas = linhas.map((row) => (row.id === id ? { ...row, status: 'CANCELLED' } : row));
    return Promise.resolve({});
  }
  if ((init?.method ?? 'GET') !== 'GET') return Promise.resolve({});
  if (url === '/dashboard/summary') return Promise.resolve({ waitingRequests: 0, oldestWaitingAt: null, pastEventRequests: 0, proposalsAwaitingClient: 0, unreadContacts: 0 });
  if (url.startsWith('/admin/bookings?page=1')) return Promise.resolve(linhas);
  return Promise.resolve([]);
};
const chamadas = (metodo: string) => apiFetch.mock.calls.filter(([, init]) => init?.method === metodo);
const opcoes = (id: string) =>
  within(screen.getByLabelText(`Status da reserva ${id}`)).getAllByRole('option').map((option) => (option as HTMLOptionElement).value);

const abrir = async (...rows: ReturnType<typeof linha>[]) => {
  linhas = rows;
  render(<MemoryRouter initialEntries={['/admin/reservas']}><BookingListPage /></MemoryRouter>);
  await screen.findByLabelText(`Status da reserva ${rows[0].id}`);
};

describe('lista de Reservas — trocas de status (auditoria do status)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAdminSummaryForTests();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    apiFetch.mockImplementation(backend);
    api.get.mockResolvedValue({ data: [] });
  });

  it('C3: cada linha oferece só o status atual e as trocas que valem a partir dele', async () => {
    await abrir(linha('PENDING', 'XP-P'), linha('CONFIRMED', 'XP-C'), linha('CANCELLED', 'XP-X'), linha('COMPLETED', 'XP-K'), linha('REFUNDED', 'XP-R'));

    expect(opcoes('XP-P').sort()).toEqual(['CANCELLED', 'CONFIRMED', 'DRAFT', 'PENDING']);
    expect(opcoes('XP-C').sort()).toEqual(['CANCELLED', 'COMPLETED', 'CONFIRMED', 'IN_PROGRESS', 'PENDING']);
    // Cancelada: reabrir como Pendente ou registrar o reembolso (nunca direto para Confirmada).
    expect(opcoes('XP-X').sort()).toEqual(['CANCELLED', 'PENDING', 'REFUNDED']);
    expect(opcoes('XP-K').sort()).toEqual(['COMPLETED', 'CONFIRMED', 'IN_PROGRESS']);
    expect(opcoes('XP-R').sort()).toEqual(['CANCELLED', 'REFUNDED']);
  });

  it('C3: "Concluída" pergunta antes; "Voltar" não grava; "Concluir" grava pela rota de status', async () => {
    await abrir(linha('CONFIRMED'));

    fireEvent.change(screen.getByLabelText('Status da reserva XP-1'), { target: { value: 'COMPLETED' } });
    let janela = await screen.findByRole('dialog', { name: 'Marcar como concluída?' });
    expect(within(janela).getByText(/pedido de avaliação/)).toBeInTheDocument();
    fireEvent.click(within(janela).getByRole('button', { name: 'Voltar' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Marcar como concluída?' })).toBeNull());
    expect(chamadas('PATCH')).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Status da reserva XP-1'), { target: { value: 'COMPLETED' } });
    janela = await screen.findByRole('dialog', { name: 'Marcar como concluída?' });
    fireEvent.click(within(janela).getByRole('button', { name: 'Concluir' }));
    await waitFor(() => expect(chamadas('PATCH')).toHaveLength(1));
    expect(chamadas('PATCH')[0][0]).toBe('/admin/bookings/XP-1/status');
    expect(JSON.parse(String(chamadas('PATCH')[0][1].body))).toEqual({ status: 'COMPLETED' });
  });

  it('C7: "Cancelada" pede o motivo e cancela pela rota de cancelar, com o motivo', async () => {
    await abrir(linha('PENDING'));

    fireEvent.change(screen.getByLabelText('Status da reserva XP-1'), { target: { value: 'CANCELLED' } });
    const janela = await screen.findByRole('dialog', { name: 'Cancelar a reserva?' });
    fireEvent.click(within(janela).getByRole('button', { name: 'Cancelar reserva' }));
    expect(await within(janela).findByText('Escreva o motivo do cancelamento.')).toBeInTheDocument();
    expect(chamadas('PUT')).toHaveLength(0);

    fireEvent.change(within(janela).getByLabelText('Motivo do cancelamento'), { target: { value: '  Cliente desistiu  ' } });
    fireEvent.click(within(janela).getByRole('button', { name: 'Cancelar reserva' }));

    await waitFor(() => expect(chamadas('PUT')).toHaveLength(1));
    expect(chamadas('PUT')[0][0]).toBe('/bookings/XP-1/cancel');
    expect(JSON.parse(String(chamadas('PUT')[0][1].body))).toEqual({ reason: 'Cliente desistiu' });
    expect(chamadas('PATCH')).toHaveLength(0);
    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Reserva cancelada' })));
    // A linha passa a Cancelada, com as trocas de uma cancelada.
    await waitFor(() => expect(opcoes('XP-1').sort()).toEqual(['CANCELLED', 'PENDING', 'REFUNDED']));
  });

  it('o cancelamento recusado pelo servidor mostra o motivo e a linha fica como estava', async () => {
    apiFetch.mockImplementation((url: string, init?: { method?: string }) =>
      init?.method === 'PUT' ? Promise.reject(new Error('Evento concluído não é cancelado.')) : backend(url, init));
    await abrir(linha('PENDING'));

    fireEvent.change(screen.getByLabelText('Status da reserva XP-1'), { target: { value: 'CANCELLED' } });
    const janela = await screen.findByRole('dialog', { name: 'Cancelar a reserva?' });
    fireEvent.change(within(janela).getByLabelText('Motivo do cancelamento'), { target: { value: 'Teste' } });
    fireEvent.click(within(janela).getByRole('button', { name: 'Cancelar reserva' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'Evento concluído não é cancelado.' })));
    expect((screen.getByLabelText('Status da reserva XP-1') as HTMLSelectElement).value).toBe('PENDING');
    // Revisão de 21/11/2026: a janela fica aberta com o motivo digitado (antes fechava antes da resposta).
    const aberta = screen.getByRole('dialog', { name: 'Cancelar a reserva?' });
    expect((within(aberta).getByLabelText('Motivo do cancelamento') as HTMLTextAreaElement).value).toBe('Teste');
  });

  it('desfazer um reembolso (Reembolsada → Cancelada) grava direto, sem pedir motivo de cancelamento', async () => {
    await abrir(linha('REFUNDED'));

    fireEvent.change(screen.getByLabelText('Status da reserva XP-1'), { target: { value: 'CANCELLED' } });

    await waitFor(() => expect(chamadas('PATCH')).toHaveLength(1));
    expect(JSON.parse(String(chamadas('PATCH')[0][1].body))).toEqual({ status: 'CANCELLED' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a troca direta (Pendente → Rascunho) grava sem janela', async () => {
    await abrir(linha('PENDING'));

    fireEvent.change(screen.getByLabelText('Status da reserva XP-1'), { target: { value: 'DRAFT' } });

    await waitFor(() => expect(chamadas('PATCH')).toHaveLength(1));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('B1: na reserva cancelada ou reembolsada, a entrega só volta ao início ou registra o recolhimento', async () => {
    await abrir(linha('CANCELLED', 'XP-X'), linha('REFUNDED', 'XP-R'), linha('CONFIRMED', 'XP-C'));
    const entregas = (id: string) =>
      within(screen.getByLabelText(`Entrega da reserva ${id}`)).getAllByRole('option').map((option) => (option as HTMLOptionElement).value);

    expect(entregas('XP-X')).toEqual(['PENDING', 'PICKUP_PENDING', 'COMPLETED']);
    expect(entregas('XP-R')).toEqual(['PENDING', 'PICKUP_PENDING', 'COMPLETED']);
    expect(entregas('XP-C')).toHaveLength(7);
  });
});
