import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

// Onda 2 da auditoria de 19/11: F6P1-01 (a moderação "Ao vivo" nunca recebia as fotos que aguardam moderação) e F6P1-03
// (a tela de anúncios do telão não tinha nenhum link no painel e lia pela rota pública com cache).
const { social, apiFetch, addNotification, io, handlers } = vi.hoisted(() => ({
  social: {
    listWalls: vi.fn(), getPosts: vi.fn(), getAdminWall: vi.fn(), updateWall: vi.fn(), moderatePost: vi.fn(), pairDevice: vi.fn(),
    getAnnouncements: vi.fn(), getAdminAnnouncements: vi.fn(), createAnnouncement: vi.fn(), updateAnnouncement: vi.fn(), deleteAnnouncement: vi.fn(),
  },
  apiFetch: vi.fn(),
  addNotification: vi.fn(),
  io: vi.fn(),
  handlers: {} as Record<string, (...args: unknown[]) => void>,
}));
vi.mock('../../../services/socialService', () => ({ socialService: social }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('socket.io-client', () => ({ io }));

import AdminSocialPage from '../AdminSocialPage';
import AdminAnnouncementPage from '../AdminAnnouncementPage';

const mural = { id: 's-1', name: 'Casamento Ana', hashtag: 'anaeleo', slug: 'casamento-ana-7k3p', layoutMode: 'LANDSCAPE', enableQrCode: true, autoApprove: false, sponsors: [] };
const pendente = { id: 'post-9', mediaUrl: 'https://img.test/9.jpg', author: 'Bia', caption: 'Chegou!', status: 'PENDING', postedAt: '2026-12-10T20:00:00.000Z' };
const Onde = () => <p data-testid="onde">{useLocation().pathname}</p>;

const abrir = async () => {
  render(
    <MemoryRouter initialEntries={['/admin/social/s-1']}>
      <Routes>
        <Route path="/admin/social/:id" element={<AdminSocialPage />} />
        <Route path="/admin/events/:id/social/announcements" element={<Onde />} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(social.getPosts).toHaveBeenCalled());
};

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(handlers)) delete handlers[k];
  io.mockReturnValue({ on: (event: string, h: (...args: unknown[]) => void) => { handlers[event] = h; }, emit: vi.fn(), disconnect: vi.fn() });
  social.listWalls.mockResolvedValue([mural]);
  social.getPosts.mockResolvedValue([]);
  social.getAdminWall.mockResolvedValue(mural);
  apiFetch.mockResolvedValue([]);
});

describe('Moderação do mural — onda 2', () => {
  it('F6P1-01: o aviso de foto para moderar busca a lista de novo (pela API) e a foto aparece na aba', async () => {
    await abrir();
    const antes = social.getPosts.mock.calls.length;
    social.getPosts.mockResolvedValue([pendente]);

    await act(async () => { handlers['moderation:pending']?.(); });

    await waitFor(() => expect(social.getPosts.mock.calls.length).toBe(antes + 1));
    expect(social.getPosts).toHaveBeenLastCalledWith(expect.objectContaining({ settingId: 's-1', status: 'PENDING' }));
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nova publicação' }));
  });

  it('F6P1-01: "Atualizar lista" busca a lista da aba', async () => {
    await abrir();
    const antes = social.getPosts.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar lista' }));
    await waitFor(() => expect(social.getPosts.mock.calls.length).toBe(antes + 1));
  });

  it('B4-12 (auditoria de 19/11): o "Sincronizar" com o Instagram saiu; a hashtag aparece como a do evento', async () => {
    await abrir();
    expect(await screen.findByRole('button', { name: 'Atualizar lista' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sincronizar/ })).toBeNull();
    expect(screen.queryByText(/Hashtag monitorada/)).toBeNull();
  });

  it('F6P1-03: o botão "Anúncios" leva à tela de anúncios do telão deste mural', async () => {
    await abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anúncios' }));
    expect(await screen.findByTestId('onde')).toHaveTextContent('/admin/events/s-1/social/announcements');
  });

  it('F6P1-03: a tela de anúncios lê pela rota do admin, sem o cache público', async () => {
    social.getAdminAnnouncements.mockResolvedValue([{ id: 'an-1', title: 'Bolo', message: 'Corte do bolo às 22h', isActive: true, type: 'TEXT', duration: 10, frequency: 10 }]);
    render(
      <MemoryRouter initialEntries={['/admin/events/s-1/social/announcements']}>
        <Routes><Route path="/admin/events/:id/social/announcements" element={<AdminAnnouncementPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Bolo')).toBeInTheDocument();
    expect(social.getAdminAnnouncements).toHaveBeenCalledWith('s-1');
    expect(social.getAnnouncements).not.toHaveBeenCalled();
  });
});
