import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import axios from 'axios';

// Onda 4 da auditoria de 19/11, primeiro lote do site: o login com Google navega uma vez só, já com o "next" (F5-12), e
// o contato pede ao menos 2 letras no nome, como o servidor, e avisa da privacidade (F5-18).
const { googleProps, addNotification, apiFetch, loginWithCredentials } = vi.hoisted(() => ({
  googleProps: vi.fn(),
  addNotification: vi.fn(),
  apiFetch: vi.fn(),
  loginWithCredentials: vi.fn(),
}));
vi.mock('../components/ui/GoogleAuthButton', () => ({
  default: (props: Record<string, unknown>) => { googleProps(props); return null; },
}));
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useGoogleLogin: (options: { onSuccess: (token: { access_token: string }) => void }) => () => options.onSuccess({ access_token: 't0k3n' }),
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ loginWithCredentials }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ loginWithCredentials }) }));
vi.mock('../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../services/api', () => ({ apiFetch, authAPI: { register: vi.fn() } }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ContactPage } from '../pages/ContactPage';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('F5-12: login com Google', () => {
  const realLocation = window.location;
  let location: { href: string };

  beforeEach(() => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'our-app');
    location = { href: '' };
    Object.defineProperty(window, 'location', { configurable: true, value: location });
  });
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const entrar = async (data: Record<string, unknown>, redirectTo?: string) => {
    // O botão de verdade (o desta página de teste é trocado por um que só guarda as props).
    const { default: GoogleAuthButton } = await vi.importActual<typeof import('../components/ui/GoogleAuthButton')>('../components/ui/GoogleAuthButton');
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { user: { name: 'Ana' }, ...data } });
    render(<GoogleAuthButton redirectTo={redirectTo} />);
    fireEvent.click(screen.getByRole('button', { name: /Entrar com Google/ }));
  };

  it('com o "next": vai para ele (antes, o redirect do servidor vencia e o "next" se perdia)', async () => {
    await entrar({ redirectTo: '/painel' }, '/admin/reservas/XP-1');
    await waitFor(() => expect(location.href).toBe('/admin/reservas/XP-1'), { timeout: 2000 });
  });

  it('sem o "next": o destino do servidor; perfil a completar vence os dois', async () => {
    await entrar({ redirectTo: '/painel' });
    await waitFor(() => expect(location.href).toBe('/painel'), { timeout: 2000 });

    cleanup();
    location.href = '';
    await entrar({ redirectTo: '/painel', shouldCompleteProfile: true }, '/admin/reservas/XP-1');
    await waitFor(() => expect(location.href).toBe('/completar-perfil'), { timeout: 2000 });
  });

  it('a tela de login passa o "next" ao botão e não navega por conta própria; o cadastro também não', () => {
    render(
      <MemoryRouter initialEntries={['/login?next=%2Fadmin%2Freservas%2FXP-1']}>
        <Routes><Route path="/login" element={<LoginPage />} /></Routes>
      </MemoryRouter>,
    );
    const loginProps = googleProps.mock.calls.slice(-1)[0][0];
    expect(loginProps).toEqual({ redirectTo: '/admin/reservas/XP-1' });

    googleProps.mockClear();
    render(<HelmetProvider><MemoryRouter><RegisterPage /></MemoryRouter></HelmetProvider>);
    expect(googleProps.mock.calls.slice(-1)[0][0]).toEqual({});
  });
});

describe('F5-18: formulário de contato', () => {
  const abrir = () => render(<HelmetProvider><MemoryRouter initialEntries={['/contato']}><ContactPage /></MemoryRouter></HelmetProvider>);

  it('nome com 1 letra: avisa e não envia (o servidor recusava com 400)', async () => {
    abrir();
    fireEvent.change(screen.getByLabelText('Nome completo *'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('E-mail *'), { target: { value: 'a@t.com' } });
    fireEvent.change(screen.getByLabelText('Sua Mensagem *'), { target: { value: 'Quero saber o preço de um kit para 100 pessoas.' } });
    fireEvent.submit(screen.getByLabelText('Nome completo *').closest('form')!);
    expect(await screen.findByText('Nome deve ter ao menos 2 caracteres')).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalledWith('/contact', expect.anything());
  });

  it('o aviso de privacidade leva à política', () => {
    abrir();
    expect(screen.getByText(/Usamos seus dados só para responder ao contato/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade');
  });
});
