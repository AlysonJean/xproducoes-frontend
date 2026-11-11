import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch, addNotification, setAuthenticatedUser } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  addNotification: vi.fn(),
  setAuthenticatedUser: vi.fn(),
}));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Ana Souza', email: 'ana@example.com', role: 'CLIENT' }, setAuthenticatedUser }),
}));

import { ProfilePage } from '../ProfilePage';

const PROFILE = {
  id: 'u1',
  name: 'Ana Souza',
  email: 'ana@example.com',
  phone: '31999990000',
  avatarUrl: null,
  bio: '',
  location: 'Belo Horizonte',
  website: null,
  companyName: 'Acme',
  jobTitle: 'Gerente',
  industry: 'events',
  verified: true,
  createdAt: '2024-03-01T12:00:00.000Z',
  totalBookings: 3,
  totalSpent: 1800.5,
  preferences: null,
  googleCalendarEmail: null,
};

const renderPage = () => render(<MemoryRouter><ProfilePage /></MemoryRouter>);
const bodyOf = (call: unknown[]) => JSON.parse((call[1] as { body: string }).body);

// Achado: as gravações do perfil chamavam PATCH /users/profile, PATCH /users/profile/preferences e
// POST /users/profile/avatar — rotas que não existem. E a tela lia "memberSince", que a API nunca mandou.
describe('ProfilePage (cliente)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    addNotification.mockReset();
    setAuthenticatedUser.mockReset();
    apiFetch.mockImplementation((url: string, init?: { method?: string; body?: string }) => {
      if (url === '/upload/avatar') return Promise.resolve({ avatarUrl: 'https://res.cloudinary.com/x/avatar_u1.jpg' });
      if (init?.method === 'PUT') return Promise.resolve({ ...PROFILE, ...JSON.parse(init.body || '{}') });
      return Promise.resolve(PROFILE);
    });
  });

  it('mostra os dados vindos da API (totais e "membro desde")', async () => {
    renderPage();
    expect(await screen.findByText(/Membro desde março de 2024/)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/1\.800,50/)).toBeInTheDocument();
    expect(screen.getByText('Gerente na Acme')).toBeInTheDocument();
  });

  it('salva por PUT /users/profile, sem e-mail e com o site completo', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Editar Perfil/ }));
    fireEvent.change(screen.getByLabelText('Site'), { target: { value: 'www.acme.com.br' } });
    fireEvent.change(screen.getByLabelText('Cargo'), { target: { value: 'Diretora' } });
    fireEvent.click(screen.getByRole('button', { name: /^Salvar$/ }));

    await waitFor(() => expect(apiFetch.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true));
    const put = apiFetch.mock.calls.find(([, init]) => init?.method === 'PUT')!;
    expect(put[0]).toBe('/users/profile');
    const body = bodyOf(put);
    expect(body).not.toHaveProperty('email');
    expect(body).toMatchObject({ website: 'https://www.acme.com.br', jobTitle: 'Diretora', companyName: 'Acme' });
    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' })));
  });

  it('salva as preferências pelo mesmo PUT', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /Notificações/ }));
    fireEvent.click(screen.getByRole('button', { name: /Salvar Preferências/ }));

    await waitFor(() => expect(apiFetch.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true));
    const put = apiFetch.mock.calls.find(([, init]) => init?.method === 'PUT')!;
    expect(put[0]).toBe('/users/profile');
    expect(bodyOf(put).preferences).toEqual({
      notifications: expect.objectContaining({ bookingUpdatesEmail: true }),
      general: expect.objectContaining({ currency: 'BRL' }),
    });
  });

  it('envia a foto por /upload/avatar e grava a URL no perfil', async () => {
    renderPage();
    await screen.findByText(/Membro desde/);
    const file = new File(['img'], 'foto.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Enviar foto de perfil'), { target: { files: [file] } });

    await waitFor(() => expect(apiFetch.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true));
    const upload = apiFetch.mock.calls.find(([url]) => url === '/upload/avatar')!;
    expect(upload[1].method).toBe('POST');
    expect(upload[1].body).toBeInstanceOf(FormData);
    const put = apiFetch.mock.calls.find(([, init]) => init?.method === 'PUT')!;
    expect(bodyOf(put)).toEqual({ avatarUrl: 'https://res.cloudinary.com/x/avatar_u1.jpg' });
    // A foto nova vai para a sessão (cabeçalho do site) sem recarregar.
    await waitFor(() => expect(setAuthenticatedUser).toHaveBeenCalledWith(expect.objectContaining({ avatarUrl: 'https://res.cloudinary.com/x/avatar_u1.jpg' })));
  });

  // D17 (aprovada em 02/11/2026): "aviso na tela e e-mail quando a senha muda". A troca encerra as outras sessões.
  it('troca a senha por POST /users/change-password e avisa que as outras sessões foram encerradas', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /Segurança/ }));
    fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: 'Atual123' } });
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'Nova1234' } });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'Nova1234' } });
    fireEvent.click(screen.getByRole('button', { name: /Alterar Senha/ }));

    await waitFor(() =>
      expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        message: 'Senha alterada. Por segurança, saímos das suas outras sessões.',
      })),
    );
    const call = apiFetch.mock.calls.find(([url]) => url === '/users/change-password')!;
    expect(call[1].method).toBe('POST');
    expect(bodyOf(call)).toEqual({ currentPassword: 'Atual123', newPassword: 'Nova1234' });
  });
});
