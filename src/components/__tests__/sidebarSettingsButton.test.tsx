import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth }));

import { AdminSidebar } from '../admin/AdminSidebar';
import { CollaboratorSidebar } from '../collaborator/CollaboratorSidebar';

// Auditoria do painel: a engrenagem "Configurações de usuário" no rodapé da sidebar era um
// <button> sem onClick — aparecia, mas não fazia nada (no admin e no colaborador).
describe('engrenagem de configurações no rodapé das sidebars', () => {
  it('admin: leva para /perfil (dados da conta e troca de senha)', () => {
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    render(<MemoryRouter initialEntries={['/admin/painel']}><AdminSidebar /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Configurações de usuário' })).toHaveAttribute('href', '/perfil');
  });

  it('colaborador: leva para /colaborador/configuracoes', () => {
    useAuth.mockReturnValue({ user: { id: 'c1', name: 'Colab', role: 'COLLABORATOR' } });
    // A sidebar só renderiza sob /collaborator (as rotas reais são /colaborador — achado à parte).
    render(<MemoryRouter initialEntries={['/collaborator/dashboard']}><CollaboratorSidebar /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Configurações de usuário' })).toHaveAttribute('href', '/colaborador/configuracoes');
  });
});
