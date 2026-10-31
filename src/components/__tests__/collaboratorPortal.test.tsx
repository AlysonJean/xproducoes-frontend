import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('../../contexts/SettingsContext', () => ({ useSettings: () => ({ companyName: 'X Produções' }) }));
vi.mock('../modals/ModalContext', () => ({ useModal: () => ({ openModal: vi.fn() }) }));
vi.mock('../ui/ThemedLogo', () => ({ default: () => <span>logo</span> }));

import { CollaboratorSidebar } from '../collaborator/CollaboratorSidebar';
import { Footer } from '../Footer';

// O portal do colaborador vive em /colaborador/* (CollaboratorRoutes), mas a barra lateral só
// renderizava sob /collaborator e os links apontavam para /collaborator/* (redirects) — a barra
// nunca aparecia nas 12 páginas que usam o CollaboratorLayout, e o rodapé público aparecia
// no lugar (ele também testava /collaborator).
describe('portal do colaborador (/colaborador/*)', () => {
  useAuth.mockReturnValue({ user: { id: 'c1', name: 'Colab', role: 'COLLABORATOR' } });

  it('a barra lateral aparece, com o item da página atual marcado', () => {
    render(<MemoryRouter initialEntries={['/colaborador/ganhos']}><CollaboratorSidebar /></MemoryRouter>);
    const ganhos = screen.getByRole('link', { name: /^Ganhos/ });
    expect(ganhos).toHaveAttribute('href', '/colaborador/ganhos');
    expect(ganhos).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /^Dashboard/ })).not.toHaveAttribute('aria-current');
  });

  it('todos os links do menu levam direto às rotas reais (sem passar por redirect)', () => {
    render(<MemoryRouter initialEntries={['/colaborador/painel']}><CollaboratorSidebar /></MemoryRouter>);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs.length).toBeGreaterThan(5);
    expect(hrefs.filter((h) => !h?.startsWith('/colaborador/'))).toEqual([]);
  });

  it('o rodapé público não aparece no portal (como no admin)', () => {
    const { container } = render(<MemoryRouter initialEntries={['/colaborador/painel']}><Footer /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });
});
