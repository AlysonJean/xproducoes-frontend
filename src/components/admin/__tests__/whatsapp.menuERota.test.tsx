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
vi.mock('../../../pages/admin/AdminWhatsAppPage', () => ({ AdminWhatsAppPage: () => <h1>Tela do WhatsApp</h1> }));

import { AdminSidebar } from '../AdminSidebar';
import AdminRoutes from '../../../routes/AdminRoutes';

// P14 (aprovada em 02/11/2026) tirou a automação antiga do WhatsApp (whatsapp-web.js, envio automático) e o endereço
// /admin/whatsapp passou a levar ao painel. Pedido de Alyson de 24/11/2026: o WhatsApp volta pela Evolution API, num
// serviço privado do servidor, só com clientes cadastrados e cada envio feito por uma pessoa. O menu e o endereço voltam.
describe('WhatsApp no menu e no endereço do painel', () => {
  it('o menu tem "WhatsApp" em Comunicação, ao lado de Contatos', () => {
    apiFetch.mockResolvedValue({ total: 0 });
    render(<MemoryRouter initialEntries={['/admin/painel']}><AdminSidebar /></MemoryRouter>);

    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', '/admin/whatsapp');
    expect(screen.getByRole('link', { name: /Contatos/ })).toHaveAttribute('href', '/admin/contatos');
  });

  it('o endereço /admin/whatsapp abre a tela do WhatsApp (não leva mais ao painel)', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/whatsapp']}>
        <Routes>
          <Route path="/admin/*" element={<AdminRoutes />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Tela do WhatsApp' })).toBeInTheDocument();
  });
});
