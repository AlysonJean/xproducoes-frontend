import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Achado (conferência de 12/11/2026): fora do localhost a moderação do mural conectava o Socket.IO em '/', o próprio
// site na Vercel, que responde 404 em /socket.io/. O selo ficava em "Reconectando…" e a moderação não recebia foto
// nova ao vivo. A tela tem de usar o SOCKET_URL (endereço direto do servidor), como a TV. O SOCKET_URL é trocado aqui
// por um endereço que não é o do localhost, para o teste falhar no código antigo (que, no localhost do jsdom, ia para
// http://localhost:4000 e, no site, para '/').
const { social, apiFetch, addNotification, io } = vi.hoisted(() => ({
  social: {
    listWalls: vi.fn(),
    getPosts: vi.fn(),
    getAdminWall: vi.fn(),
    updateWall: vi.fn(),
    moderatePost: vi.fn(),
    syncNow: vi.fn(),
    pairDevice: vi.fn(),
  },
  apiFetch: vi.fn(),
  addNotification: vi.fn(),
  io: vi.fn(),
}));
vi.mock('../../../services/socialService', () => ({ socialService: social }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../../utils/apiConfig', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/apiConfig')>()),
  SOCKET_URL: 'https://servidor.teste',
}));
vi.mock('socket.io-client', () => ({ io }));

import AdminSocialPage from '../AdminSocialPage';

const mural = {
  id: 's-1',
  name: 'Casamento Ana',
  hashtag: 'anaeleo',
  slug: 'casamento-ana-7k3p',
  layoutMode: 'LANDSCAPE',
  enableQrCode: true,
  autoApprove: false,
  sponsors: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  io.mockReturnValue({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn() });
  social.listWalls.mockResolvedValue([mural]);
  social.getPosts.mockResolvedValue([]);
  social.getAdminWall.mockResolvedValue(mural);
  apiFetch.mockResolvedValue([]);
});

describe('Moderação do mural: tempo real no endereço do servidor', () => {
  it('conecta o Socket.IO no SOCKET_URL, não no próprio site', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/social/s-1']}>
        <Routes>
          <Route path="/admin/social/:id" element={<AdminSocialPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(io).toHaveBeenCalled());
    for (const [url, options] of io.mock.calls) {
      expect(url).toBe('https://servidor.teste');
      expect(options).toMatchObject({ path: '/socket.io' });
    }
  });
});
