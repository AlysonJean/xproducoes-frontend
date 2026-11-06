import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Achado (lote 12): desde adcea6a (31/03/2026) o interceptor do axios tira o envelope { success, data } de
// cada resposta, e o socialService devolve o valor direto: a lista de murais, a lista de publicações, o mural.
// As telas do mural liam `.data` de novo: a lista de murais ficava sempre vazia, a moderação caía em "Não foi
// possível carregar as publicações do mural" e, depois de salvar as configurações, o mural sumia da tela. Os
// mocks devolvem o que o socialService de verdade devolve em produção (já sem o envelope).
const { social, apiFetch, addNotification } = vi.hoisted(() => ({
  social: {
    listWalls: vi.fn(),
    createWall: vi.fn(),
    deleteWall: vi.fn(),
    getPosts: vi.fn(),
    getAdminWall: vi.fn(),
    updateWall: vi.fn(),
    moderatePost: vi.fn(),
    syncNow: vi.fn(),
    pairDevice: vi.fn(),
  },
  apiFetch: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('../../../services/socialService', () => ({ socialService: social }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('socket.io-client', () => ({
  io: () => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn() }),
}));

import AdminSocialListPage from '../AdminSocialListPage';
import AdminSocialPage from '../AdminSocialPage';

const mural = {
  id: 's-1',
  name: 'Casamento Ana',
  hashtag: 'anaeleo',
  slug: 'casamento-ana-7k3p',
  layoutMode: 'LANDSCAPE',
  enableQrCode: true,
  autoApprove: false,
  sponsors: [{ id: 'sp-1', name: 'Buffet Sabor', imageUrl: 'https://img.test/buffet.png' }],
};
const foto = {
  id: 'p-1',
  settingId: 's-1',
  platformId: 'direct-1',
  mediaUrl: 'https://img.test/p1.jpg',
  permalink: '',
  caption: 'Que festa!',
  author: 'ana.silva',
  status: 'PENDING',
  postedAt: '2026-12-10T22:00:00.000Z',
  fetchedAt: '2026-12-10T22:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  social.listWalls.mockResolvedValue([mural]);
  social.getPosts.mockResolvedValue([foto]);
  social.getAdminWall.mockResolvedValue(mural);
  social.updateWall.mockResolvedValue({ ...mural, name: 'Casamento Ana e Léo' });
  apiFetch.mockResolvedValue([]);
});

const abrirModeracao = () =>
  render(
    <MemoryRouter initialEntries={['/admin/social/s-1']}>
      <Routes>
        <Route path="/admin/social/:id" element={<AdminSocialPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('Telas do mural com a resposta já sem o envelope (adcea6a)', () => {
  it('lista de murais: mostra os murais que o servidor devolveu', async () => {
    render(
      <MemoryRouter>
        <AdminSocialListPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Casamento Ana')).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível carregar os murais.')).not.toBeInTheDocument();
  });

  it('moderação: carrega as fotos e o mural (nome, hashtag), sem cair no erro', async () => {
    abrirModeracao();
    expect(await screen.findByText('@ana.silva')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Casamento Ana' })).toBeInTheDocument();
    expect(screen.getByText('#anaeleo')).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível carregar as publicações do mural.')).not.toBeInTheDocument();
    expect(social.getAdminWall).toHaveBeenCalledWith('s-1');
  });

  it('moderação: depois de salvar as configurações, a tela mostra o mural atualizado', async () => {
    abrirModeracao();
    await screen.findByText('@ana.silva');
    social.getAdminWall.mockResolvedValue({ ...mural, name: 'Casamento Ana e Léo' });

    fireEvent.click(screen.getByRole('button', { name: 'Configurações do mural' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(social.updateWall).toHaveBeenCalledWith('s-1', expect.objectContaining({ sponsorIds: ['sp-1'] })));
    expect(await screen.findByRole('heading', { name: 'Casamento Ana e Léo' })).toBeInTheDocument();
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Configurações salvas' }));
  });
});
