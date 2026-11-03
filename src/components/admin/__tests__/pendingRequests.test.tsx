import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch, useAuth } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));

import { AdminSidebar } from '../AdminSidebar';
import { PendingRequestsCard } from '../PendingRequestsCard';
import {
  usePendingRequests,
  resetPendingRequestsCache,
  formatPendingAge,
  PENDING_REFRESH_MS,
  type PendingRequestsSummary,
} from '../../../hooks/usePendingRequests';

// P3 (aprovado em 02/11/2026): número de pedidos de clientes aguardando resposta no menu "Reservas" e
// cartão no topo do painel. Consulta ao abrir e ao voltar à aba, no máximo uma vez por minuto, nunca
// com a aba escondida; o menu não mostra "0".

const resumo = (over: Partial<PendingRequestsSummary> = {}): PendingRequestsSummary => ({
  count: 3, oldestCreatedAt: '2026-11-02T10:00:00.000Z', oldestAgeHours: 30, level: 'red', pastEventCount: 0, ...over,
});

let escondida = false;
const mudarVisibilidade = (hidden: boolean) => {
  escondida = hidden;
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
};

const Painel = () => {
  const summary = usePendingRequests(true);
  return <PendingRequestsCard summary={summary} />;
};

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-03T15:00:00Z'));
  resetPendingRequestsCache();
  apiFetch.mockReset();
  escondida = false;
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (escondida ? 'hidden' : 'visible') });
  useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('menu "Reservas" — número de pedidos aguardando resposta', () => {
  it('mostra o número com a cor da idade do mais antigo', async () => {
    apiFetch.mockResolvedValue(resumo({ count: 3, level: 'red' }));
    render(<MemoryRouter initialEntries={['/admin/painel']}><AdminSidebar /></MemoryRouter>);
    await flush();

    expect(apiFetch).toHaveBeenCalledWith('/admin/bookings/pending-summary');
    const badge = screen.getByTitle(/3 pedidos aguardando resposta, o mais antigo há 30 h/);
    expect(badge).toHaveTextContent('3');
    expect(badge.className).toContain('text-destructive');
  });

  it('com zero pedidos, não aparece "0" no menu', async () => {
    apiFetch.mockResolvedValue(resumo({ count: 0, level: null, oldestAgeHours: null, oldestCreatedAt: null }));
    render(<MemoryRouter initialEntries={['/admin/painel']}><AdminSidebar /></MemoryRouter>);
    await flush();

    const reservas = screen.getByRole('link', { name: /Reservas/ });
    expect(reservas.textContent).not.toMatch(/\b0\b/);
  });

  it('quem não é admin não consulta', async () => {
    useAuth.mockReturnValue({ user: { id: 'm1', name: 'Gerente', role: 'MANAGER' } });
    render(<MemoryRouter initialEntries={['/admin/painel']}><AdminSidebar /></MemoryRouter>);
    await flush();

    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe('usePendingRequests — no máximo uma consulta por minuto, nunca escondida', () => {
  it('menu e cartão dividem a mesma consulta; voltar à aba antes de 1 min não consulta de novo', async () => {
    apiFetch.mockResolvedValue(resumo());
    render(<MemoryRouter><AdminSidebar /><Painel /></MemoryRouter>);
    await flush();
    expect(apiFetch).toHaveBeenCalledTimes(1);

    mudarVisibilidade(true);
    vi.setSystemTime(Date.now() + 30_000);
    mudarVisibilidade(false);
    await flush();
    expect(apiFetch).toHaveBeenCalledTimes(1);

    mudarVisibilidade(true);
    vi.setSystemTime(Date.now() + PENDING_REFRESH_MS);
    // Escondida, nada é consultado, mesmo passado o minuto.
    expect(apiFetch).toHaveBeenCalledTimes(1);
    mudarVisibilidade(false);
    await flush();
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it('falha da API: sem número e sem cartão (nada de zero inventado)', async () => {
    apiFetch.mockRejectedValue(new Error('500'));
    render(<MemoryRouter><Painel /></MemoryRouter>);
    await flush();

    expect(screen.queryByRole('link', { name: /Ver pedidos/ })).toBeNull();
  });
});

describe('cartão do painel', () => {
  const renderCard = (summary: PendingRequestsSummary | null) =>
    render(<MemoryRouter><PendingRequestsCard summary={summary} /></MemoryRouter>);

  it.each([
    ['gray', 'bg-muted'],
    ['yellow', 'text-warning'],
    ['red', 'text-destructive'],
  ] as const)('faixa %s', (level, classe) => {
    renderCard(resumo({ count: 1, level, oldestAgeHours: 2 }));
    const link = screen.getByRole('link');
    expect(link).toHaveTextContent('1 pedido aguardando resposta, o mais antigo há 2 h');
    expect(link.className).toContain(classe);
    expect(link).toHaveAttribute('href', '/admin/reservas?status=PENDING');
  });

  it('pedidos com evento passado aparecem à parte', () => {
    renderCard(resumo({ count: 0, level: null, oldestAgeHours: null, pastEventCount: 2 }));
    expect(screen.getByRole('link')).toHaveTextContent('Nenhum pedido aguardando resposta');
    expect(screen.getByRole('link')).toHaveTextContent('2 pedidos pendentes com evento que já passou');
  });

  it('nada esperando e nada passado: o cartão some', () => {
    const { container } = renderCard(resumo({ count: 0, level: null, oldestAgeHours: null, pastEventCount: 0 }));
    expect(container).toBeEmptyDOMElement();
  });
});

describe('formatPendingAge', () => {
  it.each([[0, 'há menos de 1 h'], [5, 'há 5 h'], [47, 'há 47 h'], [72, 'há 3 dias']])('%d h → %s', (h, texto) => {
    expect(formatPendingAge(h)).toBe(texto);
  });
});
