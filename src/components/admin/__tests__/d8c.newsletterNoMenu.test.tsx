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
describe('D8c — Newsletter no menu do painel', () => {
  it('o item continua levando à tela, sem prometer novidades', () => {
    apiFetch.mockResolvedValue({ total: 0 });
    render(
      <MemoryRouter initialEntries={['/admin/painel']}>
        <AdminSidebar />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /Newsletter/ });
    expect(link).toHaveAttribute('href', '/admin/newsletter');
    expect(link).toHaveTextContent('Inscrições antigas, só consulta');
    expect(link).not.toHaveTextContent(/novidades/i);
  });
});
