import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

const STATS = {
  totalClients: 0, confirmedBookings: 0, totalRevenue: 0, totalEquipments: 0,
  totalBookings: 0, completedBookings: 0, bookingsGrowth: 0, revenueGrowth: 0,
};

const abrir = (todayBookings: number) => {
  apiFetch.mockImplementation((url: string) => {
    const path = new URL(url, 'http://x').pathname;
    if (path === '/dashboard/stats') return Promise.resolve(STATS);
    if (path === '/dashboard/live-stats') return Promise.resolve({ todayBookings, todayRevenue: 0, activeUsers: 0 });
    return Promise.resolve([]);
  });
  render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);
};

// Conferência de 07/11/2026: dois pedidos feitos hoje para dezembro apareceram como "2 eventos programados para
// hoje". O número (todayBookings) conta os pedidos FEITOS hoje; a frase agora diz isso.
describe('AdminDashboardPage — frase dos pedidos de hoje', () => {
  beforeEach(() => apiFetch.mockReset());

  it.each([
    [2, 'Você recebeu 2 pedidos novos hoje.'],
    [1, 'Você recebeu 1 pedido novo hoje.'],
    [0, 'Nenhum pedido novo hoje.'],
  ])('%i pedido(s) feitos hoje: "%s"', async (n, frase) => {
    abrir(n);
    expect(await screen.findByText((_, el) => el?.tagName === 'P' && el.textContent === frase)).toBeInTheDocument();
    expect(screen.queryByText(/programados para hoje/)).not.toBeInTheDocument();
  });
});
