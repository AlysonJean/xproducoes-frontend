import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch, useAuth } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));

import { AdminSidebar } from '../AdminSidebar';
import { PendingRequestsCard, WAITING_REQUESTS_HREF, PAST_EVENT_REQUESTS_HREF } from '../PendingRequestsCard';
import { useAdminSummary, resetAdminSummaryForTests, type AdminSummary } from '../../../stores/adminSummary';

// P3 (aprovada em 02/11/2026): número de pedidos de clientes aguardando resposta no menu "Reservas" (com a cor da
// idade do mais antigo), número de mensagens não lidas em "Contatos" e cartão no topo do painel. O menu não mostra
// "0"; o leitor de tela ouve a frase, não o número solto.

const AGORA = Date.parse('2026-11-10T15:00:00.000Z');
const HORA = 60 * 60 * 1000;
const ha = (horas: number) => new Date(AGORA - horas * HORA).toISOString();

const resumo = (over: Partial<AdminSummary> = {}): AdminSummary => ({
  waitingRequests: 3, oldestWaitingAt: ha(30), pastEventRequests: 0, proposalsAwaitingClient: 0, unreadContacts: 0, ...over,
});

const flush = () => act(async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
});

const abrirMenu = async (summary: AdminSummary) => {
  apiFetch.mockResolvedValue(summary);
  render(<MemoryRouter initialEntries={['/admin/painel']}><AdminSidebar /></MemoryRouter>);
  await flush();
};
const linkDoMenu = (nome: RegExp) => screen.getByRole('link', { name: nome });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(AGORA);
  resetAdminSummaryForTests();
  apiFetch.mockReset();
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('menu do painel — números de "Reservas" e "Contatos"', () => {
  it('"Reservas" mostra quantos pedidos esperam, com a frase para o leitor de tela e a idade do mais antigo no título', async () => {
    await abrirMenu(resumo({ waitingRequests: 3, oldestWaitingAt: ha(30) }));

    expect(apiFetch).toHaveBeenCalledWith('/dashboard/summary');
    const reservas = linkDoMenu(/^Reservas/);
    expect(reservas).toHaveAccessibleName(/3 pedidos aguardando resposta$/);
    const badge = within(reservas).getByTitle('3 pedidos aguardando resposta, o mais antigo há 30 h');
    expect(within(badge).getByText('3')).toHaveAttribute('aria-hidden', 'true');
    expect(badge.className).toContain('text-destructive');
  });

  it.each([
    [2, 'text-muted-foreground'],
    [5, 'text-warning'],
    [30, 'text-destructive'],
  ])('mais antigo há %d h: cor %s', async (horas, classe) => {
    await abrirMenu(resumo({ waitingRequests: 1, oldestWaitingAt: ha(horas) }));

    const badge = within(linkDoMenu(/^Reservas/)).getByTitle(new RegExp(`^1 pedido aguardando resposta, o mais antigo há ${horas} h$`));
    expect(badge.className).toContain(classe);
  });

  it('"Contatos" mostra as mensagens não lidas (singular e plural)', async () => {
    await abrirMenu(resumo({ waitingRequests: 0, oldestWaitingAt: null, unreadContacts: 2 }));
    expect(linkDoMenu(/^Contatos/)).toHaveAccessibleName(/2 mensagens não lidas$/);
  });

  it('"Contatos" com uma mensagem: "1 mensagem não lida"', async () => {
    await abrirMenu(resumo({ waitingRequests: 0, oldestWaitingAt: null, unreadContacts: 1 }));
    expect(linkDoMenu(/^Contatos/)).toHaveAccessibleName(/1 mensagem não lida$/);
  });

  it('com zero, não aparece "0" nem em "Reservas" nem em "Contatos"', async () => {
    await abrirMenu(resumo({ waitingRequests: 0, oldestWaitingAt: null, unreadContacts: 0 }));

    for (const nome of [/^Reservas/, /^Contatos/]) {
      const link = linkDoMenu(nome);
      expect(link.textContent).not.toMatch(/\b0\b/);
      expect(link).not.toHaveAccessibleName(/aguardando|não lid/);
    }
  });

  it('quem não é admin não consulta', async () => {
    useAuth.mockReturnValue({ user: { id: 'm1', name: 'Gerente', role: 'MANAGER' } });
    render(<MemoryRouter initialEntries={['/admin/painel']}><AdminSidebar /></MemoryRouter>);
    await flush();

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('falha da API: sem número (nada de zero inventado)', async () => {
    apiFetch.mockRejectedValue(new Error('500'));
    render(<MemoryRouter initialEntries={['/admin/painel']}><AdminSidebar /></MemoryRouter>);
    await flush();

    expect(linkDoMenu(/^Reservas/)).not.toHaveAccessibleName(/aguardando/);
  });
});

describe('cartão do topo do painel', () => {
  const renderCard = (summary: AdminSummary | null) =>
    render(<MemoryRouter><PendingRequestsCard summary={summary} /></MemoryRouter>);

  it.each([
    [2, 'muted', 'bg-muted', '1 pedido aguardando resposta, o mais antigo há 2 h'],
    [5, 'warning', 'text-warning', '1 pedido aguardando resposta, o mais antigo há 5 h'],
    [30, 'destructive', 'text-destructive', '1 pedido aguardando resposta, o mais antigo há 30 h'],
    [50, 'destructive', 'text-destructive', '1 pedido aguardando resposta, o mais antigo há 2 dias'],
  ] as const)('mais antigo há %d h: tom %s', (horas, tom, classe, texto) => {
    renderCard(resumo({ waitingRequests: 1, oldestWaitingAt: ha(horas) }));

    const cartao = screen.getByRole('region', { name: 'Pedidos de clientes aguardando resposta' });
    expect(cartao).toHaveAttribute('data-tone', tom);
    expect(cartao.className).toContain(classe);
    const link = within(cartao).getByRole('link', { name: texto });
    expect(link).toHaveAttribute('href', WAITING_REQUESTS_HREF);
  });

  it('o link abre a lista de Reservas com os filtros do mesmo número: pedidos de clientes, pendentes, por vir, sem proposta, mais antigos primeiro', () => {
    const params = new URLSearchParams(WAITING_REQUESTS_HREF.split('?')[1]);
    expect(WAITING_REQUESTS_HREF.startsWith('/admin/reservas?')).toBe(true);
    expect(Object.fromEntries(params)).toEqual({ status: 'PENDING', origem: 'cliente', periodo: 'proximos', proposta: 'nao-enviada', ordem: 'antigos' });
    expect(Object.fromEntries(new URLSearchParams(PAST_EVENT_REQUESTS_HREF.split('?')[1])))
      .toEqual({ status: 'PENDING', origem: 'cliente', periodo: 'passado', ordem: 'antigos' });
  });

  it('pedidos com a data já passada aparecem à parte, numa linha com o próprio link', () => {
    renderCard(resumo({ waitingRequests: 2, oldestWaitingAt: ha(3), pastEventRequests: 2 }));

    const cartao = screen.getByRole('region', { name: 'Pedidos de clientes aguardando resposta' });
    expect(within(cartao).getByRole('link', { name: '2 pedidos aguardando resposta, o mais antigo há 3 h' })).toBeInTheDocument();
    expect(within(cartao).getByRole('link', { name: '2 pedidos com data já passada' })).toHaveAttribute('href', PAST_EVENT_REQUESTS_HREF);
  });

  it('só com pedidos de data passada: o cartão diz que nenhum espera resposta e mostra os passados', () => {
    renderCard(resumo({ waitingRequests: 0, oldestWaitingAt: null, pastEventRequests: 1 }));

    const cartao = screen.getByRole('region', { name: 'Pedidos de clientes aguardando resposta' });
    expect(cartao).toHaveTextContent('Nenhum pedido aguardando resposta');
    expect(within(cartao).getByRole('link', { name: '1 pedido com data já passada' })).toBeInTheDocument();
    expect(cartao).toHaveAttribute('data-tone', 'muted');
  });

  it('nada esperando e nada passado (ou sem resumo): o cartão some', () => {
    const { container, rerender } = renderCard(resumo({ waitingRequests: 0, oldestWaitingAt: null, pastEventRequests: 0, unreadContacts: 5 }));
    expect(container).toBeEmptyDOMElement();
    rerender(<MemoryRouter><PendingRequestsCard summary={null} /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });

  it('menu e cartão do painel dividem a mesma consulta', async () => {
    apiFetch.mockResolvedValue(resumo({ waitingRequests: 4, oldestWaitingAt: ha(1) }));
    const Painel = () => <PendingRequestsCard summary={useAdminSummary(true)} />;
    render(<MemoryRouter initialEntries={['/admin/painel']}><AdminSidebar /><Painel /></MemoryRouter>);
    await flush();

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: '4 pedidos aguardando resposta, o mais antigo há 1 h' })).toBeInTheDocument();
    expect(linkDoMenu(/^Reservas/)).toHaveAccessibleName(/4 pedidos aguardando resposta$/);
  });
});
