import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mesmo arranjo de p14.whatsappForaDoMenu.test.tsx: o menu de verdade, com a sessão de um admin.
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));

import { AdminSidebar } from '../AdminSidebar';

// D8c (aprovada em 02/11/2026), pergunta 5: o formulário de newsletter saiu do site e nada é enviado à lista. O item
// do menu do painel dizia "Inscritos para novidades"; a tela agora só mostra as inscrições antigas, para consulta.
// Onda 4 da auditoria de 19/11 (decisão de Alyson de 24/11): o item saiu do menu (as inscrições antigas são apagadas).
describe('D8c — Newsletter no menu do painel', () => {
  it('o menu não tem mais o item Newsletter nem o link /admin/newsletter', () => {
    apiFetch.mockResolvedValue({ total: 0 });
    const { container } = render(
      <MemoryRouter initialEntries={['/admin/painel']}>
        <AdminSidebar />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: /Newsletter/ })).not.toBeInTheDocument();
    expect(container.querySelector('a[href="/admin/newsletter"]')).toBeNull();
  });
});
