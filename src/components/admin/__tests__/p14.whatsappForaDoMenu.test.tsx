import type React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../AdminLayout', () => ({ AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { AdminSidebar } from '../AdminSidebar';
import WhatsappPage from '../../../pages/admin/WhatsappPage';

// P14 (aprovada em 02/11/2026), parte 1: a automação não oficial do WhatsApp fica desligada no servidor (pode
// banir o número da empresa). A tela WhatsApp (QR para conectar a automação) sai do menu do painel; a rota
// /admin/whatsapp continua. Quem abrir o endereço vê o motivo que a API manda, em vez de "Não foi possível
// consultar o serviço do WhatsApp" e um QR que nunca chega.
describe('P14 — WhatsApp fora do menu do painel', () => {
  it('o menu não tem mais "WhatsApp" nem o link /admin/whatsapp; os outros itens de Comunicação ficam', () => {
    apiFetch.mockResolvedValue({ total: 0 });
    const { container } = render(<MemoryRouter initialEntries={['/admin/painel']}><AdminSidebar /></MemoryRouter>);

    expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument();
    expect(container.querySelector('a[href="/admin/whatsapp"]')).toBeNull();
    expect(screen.getByRole('link', { name: /Contatos/ })).toHaveAttribute('href', '/admin/contatos');
    expect(screen.getByRole('link', { name: /Newsletter/ })).toHaveAttribute('href', '/admin/newsletter');
  });

  it('a tela /admin/whatsapp, aberta pelo endereço, mostra o motivo da API (automação desligada)', async () => {
    apiFetch.mockRejectedValue(new Error('A automação do WhatsApp está desligada. Mande as mensagens pelos botões de WhatsApp da reserva.'));
    render(<WhatsappPage />);

    expect(await screen.findByText('A automação do WhatsApp está desligada. Mande as mensagens pelos botões de WhatsApp da reserva.')).toBeInTheDocument();
  });
});
