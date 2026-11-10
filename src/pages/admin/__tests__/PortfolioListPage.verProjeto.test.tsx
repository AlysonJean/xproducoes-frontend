import type React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configure, render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../components/admin/AdminLayout', () => {
  const Passthrough = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  return { default: Passthrough, AdminLayout: Passthrough };
});

import { PortfolioListPage } from '../PortfolioListPage';

// Páginas inteiras: com a suíte toda rodando em paralelo, a primeira renderização passa de 1 s.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20_000 });

// Pedido do dono de 09/11/2026 (Instagram): o "Ver projeto" do painel do Instagram leva a /admin/portfolio?editar=<id>
// e o formulário desse projeto abre sozinho, uma vez. Sem o parâmetro, a tela do Portfólio continua igual.

const items = [
  { id: 'pf1', title: 'Camarote no Estádio Mineirão', slug: 'camarote-no-estadio-mineirao', imageUrl: 'https://res.cloudinary.com/x/image/upload/a.jpg', description: 'Som e luz.', eventDate: '2026-05-01T00:00:00.000Z', isPinned: true, sortOrder: 1, media: [] },
  { id: 'pf2', title: 'Festa de 15 anos', slug: 'festa-de-15-anos', imageUrl: 'https://res.cloudinary.com/x/image/upload/b.jpg', description: 'Pista.', eventDate: '2026-10-10T00:00:00.000Z', isPinned: false, sortOrder: 0, media: [] },
];

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/admin/portfolio" element={<PortfolioListPage />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue(items);
  window.localStorage.clear();
});
afterEach(() => cleanup());

describe('Portfólio no painel — abrir um projeto pelo link do Instagram', () => {
  it('?editar=<id> abre o formulário desse projeto', async () => {
    renderAt('/admin/portfolio?editar=pf2');

    expect(await screen.findByRole('dialog', { name: 'Editar projeto' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/Título/)).toHaveValue('Festa de 15 anos'));
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('sem o parâmetro (ou com um id que não existe), nenhum formulário abre', async () => {
    renderAt('/admin/portfolio');
    expect(await screen.findByText('Festa de 15 anos')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    cleanup();

    renderAt('/admin/portfolio?editar=nao-existe');
    expect(await screen.findByText('Festa de 15 anos')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
