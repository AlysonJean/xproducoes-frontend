import type React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Fuso da empresa: "a partir de hoje" é a meia-noite de Brasília.
process.env.TZ = 'America/Sao_Paulo';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Admin Teste', role: 'ADMIN' } }) }));
vi.mock('../../../components/ReceitaMensalChart', () => ({ ReceitaMensalChart: () => null }));
vi.mock('../../../components/GoogleCalendarIntegration', () => ({ GoogleCalendarIntegration: () => null }));

import AdminDashboardPage from '../AdminDashboardPage';

// Achado (auditoria ponta a ponta): para mostrar 5 "Próximos eventos", o painel baixava TODAS as
// reservas (páginas de 100, cada uma com todas as relações da reserva), e ainda buscava
// /dashboard/notifications para jogar a resposta fora.

const booking = (id: string, name: string, eventDate: string) => ({
  id, status: 'PENDING', totalPrice: '100', eventDate,
  client: { id: `c-${id}`, user: { id: `u-${id}`, name, email: `${id}@t.com` } },
});
// Fora de ordem de propósito: quem ordena é o servidor.
const BOOKINGS = [
  booking('XP-C', 'Cliente C', '2026-12-01T22:00:00.000Z'),
  booking('XP-ONTEM', 'Cliente Ontem', '2026-11-17T23:00:00.000Z'), // 17/11 às 20h em Brasília
  booking('XP-E', 'Cliente E', '2026-12-10T22:00:00.000Z'),
  booking('XP-A', 'Cliente A', '2026-11-20T22:00:00.000Z'),
  booking('XP-MADRUGADA', 'Cliente Madrugada', '2026-11-18T04:00:00.000Z'), // hoje, 1h em Brasília
  booking('XP-D', 'Cliente D', '2026-12-05T22:00:00.000Z'),
  booking('XP-B', 'Cliente B', '2026-11-22T22:00:00.000Z'),
];

const STATS = {
  totalClients: 2, confirmedBookings: 1, totalRevenue: 0, totalEquipments: 3,
  totalBookings: 4, completedBookings: 1, bookingsGrowth: 0, revenueGrowth: 0,
};

// Faz o papel do backend. GET /admin/bookings (bookingController.findAll): eventDate >= startDate,
// ordem crescente da data do evento, limit (padrão 20, máximo 100) e page.
const backend = (url: string) => {
  const u = new URL(url, 'http://x');
  if (u.pathname === '/admin/bookings') {
    const start = u.searchParams.get('startDate');
    const limit = Math.min(Number(u.searchParams.get('limit')) || 20, 100);
    const page = Number(u.searchParams.get('page')) || 1;
    const rows = BOOKINGS
      .filter((b) => !start || new Date(b.eventDate) >= new Date(start))
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    return rows.slice((page - 1) * limit, page * limit);
  }
  if (u.pathname === '/dashboard/stats') return STATS;
  if (u.pathname === '/dashboard/live-stats') return { todayBookings: 0, todayRevenue: 0, activeUsers: 0 };
  return [];
};

describe('AdminDashboardPage — Próximos eventos', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-18T15:00:00.000Z')); // 18/11, 12h em Brasília
    apiFetch.mockReset();
    apiFetch.mockImplementation((url: string) => Promise.resolve(backend(url)));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pede só os 5 próximos a partir de hoje, numa chamada, e mostra os 5 em ordem de data', async () => {
    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);

    const abrir = await screen.findAllByRole('button', { name: /^Abrir reserva de / });
    expect(abrir.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Abrir reserva de Cliente Madrugada',
      'Abrir reserva de Cliente A',
      'Abrir reserva de Cliente B',
      'Abrir reserva de Cliente C',
      'Abrir reserva de Cliente D',
    ]);
    expect(screen.queryByText('Cliente Ontem')).not.toBeInTheDocument();
    expect(screen.queryByText('Cliente E')).not.toBeInTheDocument();

    const urls = apiFetch.mock.calls.map(([url]) => String(url));
    // O resumo de pedidos pendentes (P3, cartão do topo) é outra consulta e fica fora desta conta.
    const bookingCalls = urls.filter((url) => url.startsWith('/admin/bookings') && !url.startsWith('/admin/bookings/pending-summary'));
    expect(bookingCalls).toHaveLength(1);
    const params = new URL(bookingCalls[0], 'http://x').searchParams;
    expect(params.get('startDate')).toBe('2026-11-18T03:00:00.000Z'); // meia-noite de 18/11 em Brasília
    expect(params.get('limit')).toBe('5');
    expect(params.has('page')).toBe(false);
    expect(params.has('status')).toBe(false); // sem filtro de status, como antes
  });

  it('não busca /dashboard/notifications (a resposta era jogada fora; a tela não tem sino)', async () => {
    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);
    await screen.findAllByRole('button', { name: /^Abrir reserva de / });

    const urls = apiFetch.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.startsWith('/dashboard/notifications'))).toBe(false);
    expect(urls).toEqual(expect.arrayContaining(['/dashboard/stats', '/dashboard/recent-activities', '/dashboard/live-stats']));
  });
});
