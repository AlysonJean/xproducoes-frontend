import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

const { apiFetch, useAuth, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn(), addNotification: vi.fn() }));
vi.mock('xlsx-js-style', () => ({ default: {} }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));

import BookingListPage from '../BookingListPage';
import { resetAdminSummaryForTests } from '../../../stores/adminSummary';

// P3 (aprovada em 02/11/2026): o cartão "pedidos aguardando resposta" do painel abre a lista de Reservas com filtros
// no endereço: ?status=PENDING (o filtro de status da tela), origem=cliente (pedido criado por conta de cliente),
// periodo=proximos|passado (data do evento), proposta=nao-enviada (sem "Enviar proposta") e ordem=antigos (do pedido
// mais antigo para o mais novo). Os filtros do cartão aparecem como etiquetas removíveis; mudar o status ou tirar uma
// etiqueta atualiza o endereço. Valor fora das opções é ignorado.
const AGORA = Date.parse('2026-11-10T15:00:00.000Z');
const DIA = 24 * 60 * 60 * 1000;
const em = (dias: number) => new Date(AGORA + dias * DIA).toISOString();

const base = { totalPrice: '300', client: null, clientContact: null, proposalSent: false };
const reservas = [
  // Ordem do servidor: data do evento.
  { ...base, id: 'XP-CONFIRMADA', status: 'CONFIRMED', clientName: 'Bia Confirmada', eventDate: em(1), createdAt: em(-9), creator: { role: 'CLIENT' } },
  { ...base, id: 'XP-NOVO', status: 'PENDING', clientName: 'Ana Pedido Novo', eventDate: em(2), createdAt: em(-1), creator: { role: 'CLIENT' } },
  { ...base, id: 'XP-ADMIN', status: 'PENDING', clientName: 'Caio Proposta Equipe', eventDate: em(3), createdAt: em(-20), creator: { role: 'ADMIN' } },
  { ...base, id: 'XP-RESPONDIDO', status: 'PENDING', clientName: 'Duda Respondida', eventDate: em(4), createdAt: em(-15), creator: { role: 'CLIENT' }, proposalSent: true },
  { ...base, id: 'XP-ANTIGO', status: 'PENDING', clientName: 'Eva Pedido Antigo', eventDate: em(5), createdAt: em(-6), creator: { role: 'CLIENT' } },
  { ...base, id: 'XP-PASSADO', status: 'PENDING', clientName: 'Fábio Data Passada', eventDate: em(-2), createdAt: em(-30), creator: { role: 'CLIENT' } },
];
const TODOS = reservas.map((r) => r.clientName);

const Endereco = () => <output data-testid="endereco">{useLocation().search}</output>;
const abrir = async (url: string) => {
  render(<MemoryRouter initialEntries={[url]}><BookingListPage /><Endereco /></MemoryRouter>);
  await screen.findByText('Mostrando', { exact: false });
};
const endereco = () => Object.fromEntries(new URLSearchParams(screen.getByTestId('endereco').textContent || ''));
// Nomes na ordem em que as linhas aparecem na tabela.
const linhas = () =>
  within(screen.getByRole('table')).queryAllByText((_, el) => el?.tagName === 'P' && TODOS.includes(el.textContent || '')).map((el) => el.textContent);

describe('BookingListPage — filtros pelo endereço', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
    resetAdminSummaryForTests();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    apiFetch.mockImplementation((url: string) => Promise.resolve(url.startsWith('/admin/bookings?page=1') ? reservas : []));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('?status=PENDING: abre filtrada em Pendentes', async () => {
    await abrir('/admin/reservas?status=PENDING');
    expect(screen.getByLabelText('Filtrar por status')).toHaveValue('PENDING');
    expect(screen.queryByText('Bia Confirmada')).toBeNull();
  });

  it('sem parâmetro ou com valor inválido: todos os status e nenhuma etiqueta', async () => {
    await abrir('/admin/reservas?status=QUALQUER&origem=todos&ordem=novos');
    expect(screen.getByLabelText('Filtrar por status')).toHaveValue('all');
    expect(screen.getByText('Bia Confirmada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Tirar o filtro/ })).toBeNull();
    expect(linhas()).toEqual(TODOS);
  });

  it('link do cartão: só os pedidos de clientes que esperam resposta, do mais antigo para o mais novo', async () => {
    await abrir('/admin/reservas?status=PENDING&origem=cliente&periodo=proximos&proposta=nao-enviada&ordem=antigos');

    // De fora: a confirmada, a proposta da equipe, o pedido já respondido com proposta e o de data passada.
    expect(linhas()).toEqual(['Eva Pedido Antigo', 'Ana Pedido Novo']);
    for (const etiqueta of ['Pedidos de clientes', 'Evento por vir', 'Sem proposta enviada', 'Mais antigos primeiro']) {
      expect(screen.getByRole('button', { name: `Tirar o filtro: ${etiqueta}` })).toBeInTheDocument();
    }
  });

  it('link dos passados: pedidos de clientes pendentes com a data do evento já passada', async () => {
    await abrir('/admin/reservas?status=PENDING&origem=cliente&periodo=passado&ordem=antigos');
    expect(linhas()).toEqual(['Fábio Data Passada']);
  });

  it('sem ordem=antigos, a ordem do servidor (data do evento); com ela, a data de criação', async () => {
    await abrir('/admin/reservas?origem=cliente');
    expect(linhas()).toEqual(['Bia Confirmada', 'Ana Pedido Novo', 'Duda Respondida', 'Eva Pedido Antigo', 'Fábio Data Passada']);

    fireEvent.click(screen.getByRole('button', { name: 'Tirar o filtro: Pedidos de clientes' }));
    expect(linhas()).toEqual(TODOS);
  });

  it('tirar uma etiqueta muda o endereço e a lista; o resto dos filtros fica', async () => {
    await abrir('/admin/reservas?status=PENDING&origem=cliente&periodo=proximos&proposta=nao-enviada&ordem=antigos');

    fireEvent.click(screen.getByRole('button', { name: 'Tirar o filtro: Sem proposta enviada' }));

    expect(endereco()).toEqual({ status: 'PENDING', origem: 'cliente', periodo: 'proximos', ordem: 'antigos' });
    expect(linhas()).toEqual(['Duda Respondida', 'Eva Pedido Antigo', 'Ana Pedido Novo']);
  });

  it('mudar o status grava no endereço; "Todos os status" tira o parâmetro', async () => {
    await abrir('/admin/reservas?origem=cliente');

    fireEvent.change(screen.getByLabelText('Filtrar por status'), { target: { value: 'CONFIRMED' } });
    expect(endereco()).toEqual({ origem: 'cliente', status: 'CONFIRMED' });
    expect(linhas()).toEqual(['Bia Confirmada']);

    fireEvent.change(screen.getByLabelText('Filtrar por status'), { target: { value: 'all' } });
    expect(endereco()).toEqual({ origem: 'cliente' });
  });

  it('clicar em "Reservas" no menu (a mesma tela, sem filtros no endereço) volta a todos os status e tira as etiquetas', async () => {
    await abrir('/admin/reservas?status=PENDING&origem=cliente');
    expect(screen.getByLabelText('Filtrar por status')).toHaveValue('PENDING');

    fireEvent.click(screen.getByRole('link', { name: /^Reservas/ }));

    expect(endereco()).toEqual({});
    expect(screen.getByLabelText('Filtrar por status')).toHaveValue('all');
    expect(screen.queryByRole('button', { name: /^Tirar o filtro/ })).toBeNull();
    expect(linhas()).toEqual(TODOS);
  });

  it('"Limpar" tira todos os filtros, também os do endereço', async () => {
    await abrir('/admin/reservas?status=PENDING&origem=cliente&periodo=passado');

    fireEvent.click(screen.getByRole('button', { name: /Limpar$/ }));

    expect(endereco()).toEqual({});
    expect(screen.getByLabelText('Filtrar por status')).toHaveValue('all');
    expect(linhas()).toEqual(TODOS);
  });

  it('o cartão "Pendentes" diz que conta todas as pendentes, não só os pedidos que esperam resposta', async () => {
    await abrir('/admin/reservas');

    const rotulo = screen.getByText('Pendentes (todas)');
    expect(rotulo).toHaveAttribute('title', expect.stringContaining('inclusive propostas da equipe'));
    expect(within(rotulo.parentElement as HTMLElement).getByText('5')).toBeInTheDocument(); // toda Pendente, inclusive a da equipe e a de data passada
  });
});
