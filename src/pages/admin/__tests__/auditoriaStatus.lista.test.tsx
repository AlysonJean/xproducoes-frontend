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

const linha = (status: string, id = 'XP-1', extra: Record<string, unknown> = {}) => ({
  id, status, deliveryStatus: 'PENDING', totalPrice: '900', eventDate: '2027-12-21T01:00:00.000Z',
  createdAt: '2026-11-09T12:00:00.000Z', creator: { role: 'CLIENT' }, proposalSent: false,
  clientName: 'Bruno Lima', clientContact: '31977776666', clientEmail: 'bruno@cliente.test', client: null,
  paymentStatus: null as string | null, acceptedContract: null as { acceptedAt: string | null; initialPaymentDueAt: string | null } | null,
  ...extra,
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

  // Onda 2 da auditoria do status (C5): o selo da reserva aceita pelo site.
  it('C5: selo "Aceito — aguardando sinal", "Sinal vencido" ou "Sinal registrado — falta confirmar"', async () => {
    const dia = 24 * 60 * 60 * 1000;
    await abrir(
      linha('PENDING', 'XP-A', { acceptedContract: { acceptedAt: '2026-11-20T12:00:00.000Z', initialPaymentDueAt: new Date(Date.now() + dia).toISOString() } }),
      linha('PENDING', 'XP-V', { acceptedContract: { acceptedAt: '2026-11-10T12:00:00.000Z', initialPaymentDueAt: new Date(Date.now() - dia).toISOString() } }),
      linha('PENDING', 'XP-P', { paymentStatus: 'PARTIAL', acceptedContract: { acceptedAt: '2026-11-10T12:00:00.000Z', initialPaymentDueAt: null } }),
      linha('PENDING', 'XP-N'),
    );
    expect(screen.getByText('Aceito — aguardando sinal')).toBeInTheDocument();
    expect(screen.getByText('Sinal vencido')).toBeInTheDocument();
    expect(screen.getByText('Sinal registrado — falta confirmar')).toBeInTheDocument();
  });

  it('D2: cancelar pela lista com "Avisar o cliente" desmarcada manda notifyClient: false', async () => {
    await abrir(linha('PENDING'));

    fireEvent.change(screen.getByLabelText('Status da reserva XP-1'), { target: { value: 'CANCELLED' } });
    const janela = await screen.findByRole('dialog', { name: 'Cancelar a reserva?' });
    const avisar = within(janela).getByLabelText('Avisar o cliente por e-mail');
    expect(avisar).toBeChecked();
    fireEvent.click(avisar);
    fireEvent.change(within(janela).getByLabelText('Motivo do cancelamento'), { target: { value: 'Chuva' } });
    fireEvent.click(within(janela).getByRole('button', { name: 'Cancelar reserva' }));

    await waitFor(() => expect(chamadas('PUT')).toHaveLength(1));
    expect(JSON.parse(String(chamadas('PUT')[0][1].body))).toEqual({ reason: 'Chuva', notifyClient: false });
  });

  it('revisão da onda 2: rascunho nunca enviado: cancelar começa com "Avisar o cliente" desmarcada', async () => {
    await abrir(linha('DRAFT'));

    fireEvent.change(screen.getByLabelText('Status da reserva XP-1'), { target: { value: 'CANCELLED' } });
    const janela = await screen.findByRole('dialog', { name: 'Cancelar a reserva?' });
    expect(within(janela).getByLabelText('Avisar o cliente por e-mail')).not.toBeChecked();
  });

  it('revisão da onda 2: o link do cartão (contrato=aceito-sem-sinal) mostra só os aceitos em aberto, sem sinal e por vir', async () => {
    const aceite = { acceptedAt: '2026-11-20T12:00:00.000Z', initialPaymentDueAt: null };
    linhas = [
      linha('PENDING', 'XP-A', { acceptedContract: aceite }),
      linha('DRAFT', 'XP-D', { acceptedContract: aceite }),
      linha('PENDING', 'XP-P', { paymentStatus: 'PARTIAL', acceptedContract: aceite }),
      linha('CONFIRMED', 'XP-C', { acceptedContract: aceite }),
      linha('PENDING', 'XP-N'),
      linha('PENDING', 'XP-O', { acceptedContract: aceite, eventDate: '2025-01-10T20:00:00.000Z' }),
    ];
    render(
      <MemoryRouter initialEntries={['/admin/reservas?contrato=aceito-sem-sinal&periodo=proximos&ordem=antigos']}>
        <BookingListPage />
      </MemoryRouter>,
    );
    await screen.findByLabelText('Status da reserva XP-A');

    expect(screen.getByLabelText('Status da reserva XP-D')).toBeInTheDocument();
    for (const id of ['XP-P', 'XP-C', 'XP-N', 'XP-O']) expect(screen.queryByLabelText(`Status da reserva ${id}`)).not.toBeInTheDocument();
    expect(screen.getByText('Contrato aceito, sem sinal')).toBeInTheDocument();
  });

  it('D6: confirmar pela lista a reserva aceita sem pagamento pergunta "registrar o sinal" e manda markInitialPaymentReceived', async () => {
    await abrir(linha('PENDING', 'XP-1', { acceptedContract: { acceptedAt: '2026-11-20T12:00:00.000Z', initialPaymentDueAt: null } }));

    fireEvent.change(screen.getByLabelText('Status da reserva XP-1'), { target: { value: 'CONFIRMED' } });
    const janela = await screen.findByRole('dialog', { name: 'Confirmar a reserva?' });
    expect(within(janela).getByLabelText('Registrar o sinal como recebido')).toBeChecked();
    fireEvent.click(within(janela).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(chamadas('PATCH')).toHaveLength(1));
    expect(JSON.parse(String(chamadas('PATCH')[0][1].body))).toEqual({ status: 'CONFIRMED', markInitialPaymentReceived: true });
  });

  it('D6: sem contrato aceito, a pergunta não aparece; D1: o aviso da pré-reserva que o PATCH devolve aparece', async () => {
    apiFetch.mockImplementation((url: string, init?: { method?: string }) =>
      init?.method === 'PATCH' ? Promise.resolve({ conflictWarning: 'Atenção: pré-reserva no mesmo kit.' }) : backend(url, init));
    await abrir(linha('PENDING'));

    fireEvent.change(screen.getByLabelText('Status da reserva XP-1'), { target: { value: 'CONFIRMED' } });
    const janela = await screen.findByRole('dialog', { name: 'Confirmar a reserva?' });
    expect(within(janela).queryByLabelText('Registrar o sinal como recebido')).not.toBeInTheDocument();
    fireEvent.click(within(janela).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', message: 'Atenção: pré-reserva no mesmo kit.' })));
    expect(JSON.parse(String(chamadas('PATCH')[0][1].body))).toEqual({ status: 'CONFIRMED' });
  });

  it('onda 2b (D8): "Reembolsada" pede o valor e o dia; sem valor ou acima do valor da reserva, não grava', async () => {
    await abrir(linha('CANCELLED', 'XP-1', { paymentStatus: 'PAID' }));

    fireEvent.change(screen.getByLabelText('Status da reserva XP-1'), { target: { value: 'REFUNDED' } });
    const janela = await screen.findByRole('dialog', { name: 'Registrar o reembolso' });
    expect(within(janela).getByLabelText('Dia da devolução')).toHaveValue(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()));

    fireEvent.click(within(janela).getByRole('button', { name: 'Registrar reembolso' }));
    expect(within(janela).getByText('Digite o valor devolvido ao cliente (maior que zero).')).toBeInTheDocument();
    fireEvent.change(within(janela).getByLabelText('Valor devolvido (R$)'), { target: { value: '900.01' } });
    fireEvent.click(within(janela).getByRole('button', { name: 'Registrar reembolso' }));
    expect(within(janela).getByText('O valor devolvido passa do valor da reserva.')).toBeInTheDocument();
    fireEvent.change(within(janela).getByLabelText('Dia da devolução'), { target: { value: '2099-01-01' } });
    fireEvent.change(within(janela).getByLabelText('Valor devolvido (R$)'), { target: { value: '450' } });
    fireEvent.click(within(janela).getByRole('button', { name: 'Registrar reembolso' }));
    expect(within(janela).getByText('O dia da devolução não pode ser no futuro.')).toBeInTheDocument();
    expect(chamadas('PATCH')).toHaveLength(0);
  });

  it('onda 2b (D8): com o valor e o dia, grava Reembolsada e o pagamento da linha vira "Devolvido", travado', async () => {
    apiFetch.mockImplementation((url: string, init?: { method?: string }) =>
      init?.method === 'PATCH' ? Promise.resolve({ status: 'REFUNDED', paymentStatus: 'REFUNDED' }) : backend(url, init));
    await abrir(linha('CANCELLED', 'XP-1', { paymentStatus: 'PAID' }));

    fireEvent.change(screen.getByLabelText('Status da reserva XP-1'), { target: { value: 'REFUNDED' } });
    const janela = await screen.findByRole('dialog', { name: 'Registrar o reembolso' });
    fireEvent.change(within(janela).getByLabelText('Valor devolvido (R$)'), { target: { value: '450.50' } });
    fireEvent.change(within(janela).getByLabelText('Dia da devolução'), { target: { value: '2026-11-20' } });
    fireEvent.click(within(janela).getByRole('button', { name: 'Registrar reembolso' }));

    await waitFor(() => expect(chamadas('PATCH')).toHaveLength(1));
    expect(JSON.parse(String(chamadas('PATCH')[0][1].body))).toEqual({ status: 'REFUNDED', refundAmount: 450.5, refundedAt: '2026-11-20' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Registrar o reembolso' })).not.toBeInTheDocument());
    const pagamento = await screen.findByLabelText('Pagamento da reserva XP-1');
    await waitFor(() => expect(pagamento).toHaveValue('REFUNDED'));
    expect(pagamento).toBeDisabled();
    expect(within(pagamento).getAllByRole('option').map((o) => o.textContent)).toEqual(['Devolvido']);
  });

  it('onda 2b (revisão): o servidor recusa o reembolso: a janela fica aberta com o que foi digitado e o motivo aparece', async () => {
    apiFetch.mockImplementation((url: string, init?: { method?: string }) =>
      init?.method === 'PATCH' ? Promise.reject(new Error('O valor devolvido passa do valor da reserva.')) : backend(url, init));
    await abrir(linha('CANCELLED', 'XP-1', { paymentStatus: 'PAID', totalPrice: '0' }));

    fireEvent.change(screen.getByLabelText('Status da reserva XP-1'), { target: { value: 'REFUNDED' } });
    const janela = await screen.findByRole('dialog', { name: 'Registrar o reembolso' });
    fireEvent.change(within(janela).getByLabelText('Valor devolvido (R$)'), { target: { value: '450' } });
    fireEvent.click(within(janela).getByRole('button', { name: 'Registrar reembolso' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'O valor devolvido passa do valor da reserva.' })));
    expect(screen.getByRole('dialog', { name: 'Registrar o reembolso' })).toBeInTheDocument();
    expect(within(screen.getByRole('dialog', { name: 'Registrar o reembolso' })).getByLabelText('Valor devolvido (R$)')).toHaveValue(450);
  });

  it('onda 2b: o filtro de pagamento tem "Devolvido"; o seletor de pagamento comum não oferece Devolvido', async () => {
    await abrir(linha('REFUNDED', 'XP-R', { paymentStatus: 'REFUNDED' }), linha('PENDING', 'XP-P'));

    expect(within(screen.getByLabelText('Pagamento da reserva XP-P')).queryByRole('option', { name: 'Devolvido' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filtrar por pagamento'), { target: { value: 'REFUNDED' } });
    expect(screen.getByLabelText('Status da reserva XP-R')).toBeInTheDocument();
    expect(screen.queryByLabelText('Status da reserva XP-P')).not.toBeInTheDocument();
  });

  it('onda 2b (B3): confirmar de novo sem repetir o aviso: a tela diz que o cliente já tinha recebido a confirmação', async () => {
    apiFetch.mockImplementation((url: string, init?: { method?: string }) =>
      init?.method === 'PATCH' ? Promise.resolve({ confirmationNoticeSkipped: true }) : backend(url, init));
    await abrir(linha('PENDING'));

    fireEvent.change(screen.getByLabelText('Status da reserva XP-1'), { target: { value: 'CONFIRMED' } });
    const janela = await screen.findByRole('dialog', { name: 'Confirmar a reserva?' });
    fireEvent.click(within(janela).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'info',
        message: 'O cliente já tinha recebido a confirmação desta data: o e-mail e o aviso no site não foram repetidos.',
      })),
    );
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
