import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth }));

import { AdminLayout } from '../admin/AdminLayout';
import { CollaboratorLayout } from '../collaborator/CollaboratorLayout';

// Sem min-w-0, a área de conteúdo (item flex) não encolhe abaixo da largura do conteúdo: no
// celular ela esticava além da tela (Ganhos do colaborador 556 px, painel admin até 761 px numa
// tela de 390) e a página inteira rolava para o lado. Medido no Chromium antes/depois; o jsdom
// não calcula layout, então este teste só guarda a classe que resolve.
describe('layouts com barra lateral — conteúdo cabe na tela do celular', () => {
  it('AdminLayout: área de conteúdo com min-w-0', () => {
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    render(<MemoryRouter initialEntries={['/admin/painel']}><AdminLayout><p>conteúdo admin</p></AdminLayout></MemoryRouter>);
    expect(screen.getByText('conteúdo admin').closest('main')?.parentElement).toHaveClass('flex-1', 'min-w-0');
  });

  it('CollaboratorLayout: área de conteúdo com min-w-0', () => {
    useAuth.mockReturnValue({ user: { id: 'c1', name: 'Colab', role: 'COLLABORATOR' } });
    render(<MemoryRouter initialEntries={['/colaborador/ganhos']}><CollaboratorLayout><p>conteúdo colab</p></CollaboratorLayout></MemoryRouter>);
    expect(screen.getByText('conteúdo colab').closest('main')?.parentElement).toHaveClass('flex-1', 'min-w-0');
  });
});
