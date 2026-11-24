import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AxiosError, AxiosHeaders } from 'axios';

// Onda 4 da auditoria de 19/11, lote 4-IV, telas do painel: valor da atividade (F6P1-10), motivo do erro do mural
// (F6P1-14), "Carregar mais" fotos (F6P1-17), patrocinador sem logotipo (F6P1-15), lista de clientes (F7admin2-10) e
// as reservas na ficha do cliente (F7admin2-14).
const { apiFetch, addNotification, social, clients } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  addNotification: vi.fn(),
  social: { listWalls: vi.fn(), createWall: vi.fn(), deleteWall: vi.fn(), getPosts: vi.fn(), getAdminWall: vi.fn(), updateWall: vi.fn(), moderatePost: vi.fn(), pairDevice: vi.fn() },
  clients: [] as unknown[],
}));
vi.mock('../services/api', () => ({ apiFetch, api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/services/api', () => ({ apiFetch, api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../services/socialService', () => ({ socialService: social }));
vi.mock('../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../components/ReceitaMensalChart', () => ({ ReceitaMensalChart: () => null }));
vi.mock('../components/GoogleCalendarIntegration', () => ({ GoogleCalendarIntegration: () => null }));
vi.mock('@/hooks', () => ({
  useClients: () => ({ clients, isLoading: false, error: null, fetchClients: vi.fn(), deleteClient: vi.fn(), meta: null }),
}));
vi.mock('@/components/forms/ClientFormPage', () => ({ default: () => null }));

import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminSocialListPage from '../pages/admin/AdminSocialListPage';
import AdminSocialPage from '../pages/admin/AdminSocialPage';
import AdminSponsorPage from '../pages/admin/AdminSponsorPage';
import ClientListPage from '../pages/admin/ClientListPage';
import { ClientEditPage } from '../pages/admin/ClientEditPage';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  apiFetch.mockResolvedValue([]);
});

describe('F6P1-10: valor na atividade recente', () => {
  it('pedido sem valor não mostra "0"; com valor, sem o "+" verde de recebimento', async () => {
    apiFetch.mockImplementation(async (url: string) => {
      const path = new URL(url, 'http://x').pathname;
      if (path === '/dashboard/stats') return { totalClients: 0, confirmedBookings: 0, totalRevenue: 0, totalBookings: 0 };
      if (path === '/dashboard/recent-activities') {
        return [
          { id: 'b1', type: 'booking', title: 'Pedido sem valor', description: 'Ana', amount: 0, timestamp: '2026-11-24T12:00:00.000Z' },
          { id: 'b2', type: 'booking', title: 'Pedido com valor', description: 'Bia', amount: 1500, timestamp: '2026-11-24T11:00:00.000Z' },
        ];
      }
      if (path === '/dashboard/live-stats') return { todayBookings: 0 };
      return [];
    });
    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);
    const semValor = (await screen.findByText('Pedido sem valor')).closest('a, button, div[class*="flex items-start"]') as HTMLElement;
    expect(semValor.textContent).not.toMatch(/0$/);
    expect(semValor.textContent).not.toContain('R$');
    const comValor = screen.getByText('Pedido com valor').closest('a, button, div[class*="flex items-start"]') as HTMLElement;
    expect(comValor.textContent).toMatch(/R\$\s*1\.500,00/);
    expect(comValor.textContent).not.toContain('+R$');
    expect(within(comValor).getByText(/R\$\s*1\.500,00/)).not.toHaveClass('text-success');
  });
});

describe('F6P1-14: erro ao criar mural', () => {
  it('mostra o motivo do servidor (em `message`), não "Request failed with status code"', async () => {
    social.listWalls.mockResolvedValue([]);
    const config = { headers: new AxiosHeaders() };
    social.createWall.mockRejectedValue(new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', config, undefined, {
      status: 400, statusText: '', headers: {}, config, data: { success: false, message: 'Este link (slug) já está em uso por outro mural.' },
    }));
    render(<MemoryRouter><AdminSocialListPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Novo mural' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Nome do mural/), { target: { value: 'Festa' } });
    fireEvent.change(within(dialog).getByLabelText(/Hashtag monitorada/), { target: { value: 'festa' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar mural' }));
    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'Este link (slug) já está em uso por outro mural.' })));
  });
});

describe('F6P1-17: "Carregar mais" fotos do mural', () => {
  const foto = (i: number) => ({ id: `p-${i}`, settingId: 's-1', platformId: `d-${i}`, mediaUrl: `https://img.test/${i}.jpg`, permalink: '', author: `autor${i}`, status: 'PENDING', postedAt: '2026-12-10T22:00:00.000Z', fetchedAt: '2026-12-10T22:00:00.000Z' });

  it('página cheia mostra o botão; ele pede a próxima página e acrescenta sem repetir', async () => {
    const pagina1 = Array.from({ length: 100 }, (_, i) => foto(i));
    social.getPosts.mockImplementation(async ({ page }: { page: number }) => (page === 1 ? pagina1 : [foto(99), foto(100), foto(101)]));
    social.getAdminWall.mockResolvedValue({ id: 's-1', name: 'Mural', hashtag: 'festa', slug: 'festa', sponsors: [] });
    render(
      <MemoryRouter initialEntries={['/admin/social/s-1']}>
        <Routes><Route path="/admin/social/:id" element={<AdminSocialPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('@autor0')).toBeInTheDocument();
    expect(social.getPosts).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 100 }));
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais' }));
    expect(await screen.findByText('@autor101')).toBeInTheDocument();
    expect(social.getPosts).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, limit: 100 }));
    expect(screen.getAllByText('@autor99')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
  }, 20_000); // desenha 100 fotos: sob a carga da suíte inteira passa de 5 s

  it('página incompleta: sem o botão', async () => {
    social.getPosts.mockResolvedValue([foto(1)]);
    social.getAdminWall.mockResolvedValue({ id: 's-1', name: 'Mural', hashtag: 'festa', slug: 'festa', sponsors: [] });
    render(
      <MemoryRouter initialEntries={['/admin/social/s-1']}>
        <Routes><Route path="/admin/social/:id" element={<AdminSocialPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('@autor1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
  });
});

describe('F6P1-15: patrocinador sem logotipo', () => {
  it('avisa e não envia (antes não acontecia nada); a prévia é liberada ao trocar o arquivo e ao fechar', async () => {
    URL.createObjectURL = vi.fn(() => `blob:previa-${Math.random()}`);
    URL.revokeObjectURL = vi.fn();
    render(<MemoryRouter><AdminSponsorPage /></MemoryRouter>);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Novo patrocinador' }))[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Nome do patrocinador/), { target: { value: 'Buffet Sabor' } });
    fireEvent.submit(within(dialog).getByRole('button', { name: /Cadastrar/ }).closest('form')!);
    expect(addNotification).toHaveBeenCalledWith({ type: 'warning', title: 'Escolha o logotipo', message: 'Selecione a imagem do patrocinador antes de cadastrar.' });
    expect(apiFetch).not.toHaveBeenCalledWith('/admin/sponsors', expect.anything());

    const input = within(dialog).getByLabelText('Logotipo do patrocinador');
    fireEvent.change(input, { target: { files: [new File(['a'], 'a.png', { type: 'image/png' })] } });
    fireEvent.change(input, { target: { files: [new File(['b'], 'b.png', { type: 'image/png' })] } });
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});

describe('F7admin2-10: lista de clientes', () => {
  it('sem o filtro "Pendente" e sem CPF/CNPJ; a estrela VIP segue o gasto acima de R$ 5.000', () => {
    clients.splice(0, clients.length,
      { id: 'c1', name: 'Ana Rica', email: 'ana@t.com', status: 'ACTIVE', totalBookings: 9, totalSpent: 7200, isVip: false, taxId: '12.345.678/0001-90', createdAt: '2026-08-10T15:00:00.000Z' },
      { id: 'c2', name: 'Bia Marcada', email: 'bia@t.com', status: 'ACTIVE', totalBookings: 1, totalSpent: 300, isVip: true, createdAt: '2026-08-11T15:00:00.000Z' },
    );
    render(<MemoryRouter initialEntries={['/admin/clientes']}><ClientListPage /></MemoryRouter>);
    expect(screen.queryByRole('option', { name: 'Pendente' })).not.toBeInTheDocument();
    expect(screen.queryByText(/CPF\/CNPJ/)).not.toBeInTheDocument();
    const linha = (nome: string) => screen.getAllByText(nome)[0].closest('tr, li, div') as HTMLElement;
    expect(within(linha('Ana Rica')).getByLabelText('Cliente VIP')).toBeInTheDocument();
    expect(within(linha('Bia Marcada')).queryByLabelText('Cliente VIP')).not.toBeInTheDocument();
  });
});

describe('F7admin2-14: ficha do cliente', () => {
  function Onde() {
    return <p data-testid="onde">{useLocation().pathname}</p>;
  }

  it('lista as reservas do cliente com o total gasto (confirmadas, em andamento e concluídas)', async () => {
    apiFetch.mockImplementation(async (url: string) => {
      if (url === '/admin/clients/c1') return { id: 'c1', name: 'Ana', email: 'ana@t.com', phone: '' };
      if (url.startsWith('/admin/bookings?userId=c1')) {
        return [
          { id: 'XP-A', eventTitle: 'Formatura', eventDate: '2026-12-10T22:00:00.000Z', status: 'COMPLETED', totalPrice: '1500' },
          { id: 'XP-B', eventTitle: 'Casamento', eventDate: '2027-01-10T22:00:00.000Z', status: 'CONFIRMED', totalPrice: 900 },
          { id: 'XP-C', eventTitle: 'Aniversário', eventDate: '2027-02-10T22:00:00.000Z', status: 'CANCELLED', totalPrice: 700 },
        ];
      }
      return [];
    });
    render(
      <MemoryRouter initialEntries={['/admin/clientes/c1/editar']}>
        <Routes><Route path="/admin/clientes/:id/editar" element={<ClientEditPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('link', { name: 'Formatura' })).toHaveAttribute('href', '/admin/reservas/XP-A');
    expect(screen.getByRole('link', { name: 'Aniversário' })).toBeInTheDocument();
    expect(screen.getByText(/Total gasto/).textContent).toMatch(/R\$\s*2\.400,00/);
    expect(apiFetch).toHaveBeenCalledWith('/admin/bookings?userId=c1&limit=100');
  });

  it('"Voltar" leva para onde a pessoa estava (antes, sempre para a lista)', async () => {
    apiFetch.mockImplementation(async (url: string) => (url === '/admin/clients/c1' ? { id: 'c1', name: 'Ana', email: 'ana@t.com' } : []));
    render(
      <MemoryRouter initialEntries={['/admin/reservas/XP-A', '/admin/clientes/c1/editar']} initialIndex={1}>
        <Routes>
          <Route path="/admin/clientes/:id/editar" element={<ClientEditPage />} />
          <Route path="*" element={<Onde />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Voltar' }));
    expect(await screen.findByTestId('onde')).toHaveTextContent('/admin/reservas/XP-A');
  });
});
