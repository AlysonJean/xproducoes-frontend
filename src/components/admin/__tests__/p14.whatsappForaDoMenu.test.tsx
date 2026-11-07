import type React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../AdminLayout', () => ({ AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../routes/RouteGuards', () => ({ ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../pages/admin/AdminDashboardPage', () => ({ AdminDashboardPage: () => <h1>Painel do admin</h1> }));

import { AdminSidebar } from '../AdminSidebar';
import AdminRoutes from '../../../routes/AdminRoutes';

// P14 (aprovada em 02/11/2026), parte 1: a automação não oficial do WhatsApp fica desligada no servidor (pode
// banir o número da empresa). A tela WhatsApp (QR para conectar a automação) saiu do menu do painel. Na parte 3
// a automação saiu do servidor e a tela saiu de vez: o endereço antigo /admin/whatsapp leva ao painel.
describe('P14 — WhatsApp fora do menu do painel', () => {
  it('o menu não tem mais "WhatsApp" nem o link /admin/whatsapp; os outros itens de Comunicação ficam', () => {
    apiFetch.mockResolvedValue({ total: 0 });
    const { container } = render(<MemoryRouter initialEntries={['/admin/painel']}><AdminSidebar /></MemoryRouter>);

    expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument();
    expect(container.querySelector('a[href="/admin/whatsapp"]')).toBeNull();
    expect(screen.getByRole('link', { name: /Contatos/ })).toHaveAttribute('href', '/admin/contatos');
    expect(screen.getByRole('link', { name: /Newsletter/ })).toHaveAttribute('href', '/admin/newsletter');
  });

  it('o endereço antigo /admin/whatsapp leva ao painel (a tela do QR saiu na parte 3)', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/whatsapp']}>
        <Routes>
          <Route path="/admin/*" element={<AdminRoutes />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Painel do admin' })).toBeInTheDocument();
  });
});
