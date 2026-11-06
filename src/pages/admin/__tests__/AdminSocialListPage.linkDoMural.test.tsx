import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { listWalls, createWall, addNotification } = vi.hoisted(() => ({
  listWalls: vi.fn(),
  createWall: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('../../../services/socialService', () => ({ socialService: { listWalls, createWall, deleteWall: vi.fn() } }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import AdminSocialListPage from '../AdminSocialListPage';

// D5 (Q4, aprovada em 02/11/2026): mural novo ganha um código aleatório no fim do link, para que o mural de
// uma festa particular não seja achado por adivinhação. O formulário avisa isso antes de criar, e depois de
// criar mostra o endereço final (o que foi digitado não é mais o link exato).
beforeEach(() => {
  vi.clearAllMocks();
  listWalls.mockResolvedValue([]);
  // Como o socialService de verdade: o interceptor do axios tira o envelope { success, data } da resposta do
  // POST /admin/social/create, e chega o mural criado.
  createWall.mockImplementation(async (data: { name: string; slug?: string }) => ({
    id: 's-novo',
    name: data.name,
    hashtag: 'festa',
    slug: 'casamento-ana-7k3p',
  }));
});

const abrirFormulario = async () => {
  render(
    <MemoryRouter>
      <AdminSocialListPage />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Novo mural' }));
  return screen.findByRole('dialog');
};

describe('Novo mural — código aleatório no link (D5)', () => {
  it('o campo do endereço explica o código no fim e o que acontece se ficar em branco', async () => {
    const dialog = await abrirFormulario();
    expect(within(dialog).getByText(/No fim entra um código aleatório \(ex\.: casamento-ana-7k3p\)/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Se ficar em branco, usamos o nome do mural/)).toBeInTheDocument();
  });

  it('depois de criar, o aviso mostra o endereço final do telão', async () => {
    const dialog = await abrirFormulario();
    fireEvent.change(within(dialog).getByLabelText(/Nome do mural/), { target: { value: 'Casamento Ana' } });
    fireEvent.change(within(dialog).getByLabelText(/Hashtag monitorada/), { target: { value: 'anaeleo' } });
    fireEvent.change(within(dialog).getByLabelText(/Endereço do telão/), { target: { value: 'casamento-ana' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar mural' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalled());
    expect(createWall).toHaveBeenCalledWith({ name: 'Casamento Ana', hashtag: 'anaeleo', slug: 'casamento-ana' });
    expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', message: 'Endereço do telão: /tv?slug=casamento-ana-7k3p' }),
    );
  });
});
