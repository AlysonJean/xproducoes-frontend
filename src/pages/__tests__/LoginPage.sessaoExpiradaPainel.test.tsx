import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Decisão de Alyson (12/11/2026, "faça no padrão dos grandes aplicativos"): quando a renovação é recusada, a pessoa
// cai na tela de login e vê UMA vez "Sua sessão expirou por segurança. Entre de novo.".
// Achado (revisão): no painel, a renovação recusada faz duas coisas: o evento auth:logout (o AuthContext zera a conta
// e o ProtectedRoute leva à tela de login pelo próprio site) e o carregamento de /login (window.location.href). A tela
// de login aparece primeiro na página antiga, um instante antes de a página nova chegar. Se ela apagasse o aviso ali,
// a página nova de /login abria sem ele. Aqui: AuthContext, guardas de rota, authservice e tela de login de verdade;
// só a API (fetch e authAPI) é simulada. A "página nova" é um carregamento com módulos novos, sem desmontar a antiga
// (o navegador descarta a página antiga sem rodar a limpeza do React).
const { authAPI, apiFetch, addNotification } = vi.hoisted(() => ({
  authAPI: { getProfile: vi.fn(), logout: vi.fn() },
  apiFetch: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('../../services/api', () => ({ authAPI, apiFetch }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../components/ui/GoogleAuthButton', () => ({ default: () => null }));
// O carregador de página busca uma animação pela rede; aqui basta um texto.
vi.mock('../../components/ui/PageLoadingSpinner', () => ({ PageLoadingSpinner: () => <p>Carregando</p> }));

import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { ProtectedRoute, AuthRedirect } from '../../routes/RouteGuards';
import { LoginPage } from '../LoginPage';
import { authService } from '../../services/authservice';

const AVISO = 'Sua sessão expirou por segurança. Entre de novo.';
const fetchMock = vi.fn();
const realLocation = window.location;

function clearCookies() {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
}

// A recusa do /auth/refresh apaga os cookies da sessão (clearAuthCookies), inclusive o sinal x_session.
const recusaDaRenovacao = (corpo: unknown) => async () => {
  clearCookies();
  return { ok: false, status: 401, json: async () => corpo };
};

function Painel() {
  const { logout } = useAuth();
  return (
    <div>
      <p>Painel do cliente</p>
      <button onClick={() => void logout()}>Sair</button>
    </div>
  );
}

type Modulos = {
  AuthProvider: typeof AuthProvider;
  ProtectedRoute: typeof ProtectedRoute;
  AuthRedirect: typeof AuthRedirect;
  LoginPage: typeof LoginPage;
};

const site = (m: Modulos, inicio: string) => (
  <m.AuthProvider>
    <MemoryRouter initialEntries={[inicio]}>
      <Routes>
        <Route path="/cliente/painel" element={<m.ProtectedRoute><Painel /></m.ProtectedRoute>} />
        <Route path="/login" element={<m.AuthRedirect><m.LoginPage /></m.AuthRedirect>} />
      </Routes>
    </MemoryRouter>
  </m.AuthProvider>
);

// O carregamento de /login que o authservice pediu: módulos novos, num lugar novo da tela.
async function paginaNovaDeLogin() {
  vi.resetModules();
  const m: Modulos = {
    AuthProvider: (await import('../../contexts/AuthContext')).AuthProvider,
    ProtectedRoute: (await import('../../routes/RouteGuards')).ProtectedRoute,
    AuthRedirect: (await import('../../routes/RouteGuards')).AuthRedirect,
    LoginPage: (await import('../LoginPage')).LoginPage,
  };
  const container = document.body.appendChild(document.createElement('div'));
  const pagina = render(site(m, '/login'), { container });
  await waitFor(() => expect(telaDeLogin(pagina.container)).toBeInTheDocument());
  return { pagina };
}

const telaDeLogin = (container: HTMLElement) => within(container).getByRole('button', { name: /^Entrar$/ });
const chamadasDeRenovacao = () => fetchMock.mock.calls.filter(([url]) => String(url).includes('/auth/refresh')).length;

describe('sessão expirada no painel: o aviso chega à página nova de /login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCookies();
    sessionStorage.clear();
    document.cookie = 'x_session=1; path=/';
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(window, 'location', { configurable: true, value: { pathname: '/cliente/painel', href: '/cliente/painel' } });
    authAPI.getProfile.mockResolvedValue({ data: { id: 'u1', name: 'Ana', email: 'ana@exemplo.test', role: 'CLIENT' } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  it('renovação recusada (SESSION_EXPIRED_ABSOLUTE): a tela de login de passagem e a página nova mostram o aviso; recarregar não repete; sem laço', async () => {
    const antiga = render(site({ AuthProvider, ProtectedRoute, AuthRedirect, LoginPage }, '/cliente/painel'));
    expect(await screen.findByText('Painel do cliente')).toBeInTheDocument();

    fetchMock.mockImplementation(recusaDaRenovacao({ success: false, code: 'SESSION_EXPIRED_ABSOLUTE', error: AVISO }));
    await act(async () => {
      await authService.refreshToken();
    });
    expect(window.location.href).toBe('/login');
    // Ainda na página antiga, o painel já caiu na tela de login (auth:logout + ProtectedRoute).
    await waitFor(() => expect(telaDeLogin(antiga.container)).toBeInTheDocument());
    expect(await within(antiga.container).findByText(AVISO)).toBeInTheDocument();

    const { pagina } = await paginaNovaDeLogin();
    expect(within(pagina.container).getByText(AVISO)).toBeInTheDocument();
    // A página nova não tenta renovar de novo (o sinal x_session saiu): uma renovação só, sem laço.
    expect(chamadasDeRenovacao()).toBe(1);
    expect(authAPI.getProfile).toHaveBeenCalledTimes(1);

    // Recarregar a tela de login (outra página nova) não repete o aviso.
    const { pagina: recarregada } = await paginaNovaDeLogin();
    expect(within(recarregada.container).queryByText(AVISO)).not.toBeInTheDocument();
    expect(chamadasDeRenovacao()).toBe(1);
  });

  it('"Sair" normal no painel: nem a tela de passagem nem a página nova mostram o aviso', async () => {
    authAPI.logout.mockImplementation(async () => {
      clearCookies(); // POST /auth/logout apaga os cookies
    });
    const antiga = render(site({ AuthProvider, ProtectedRoute, AuthRedirect, LoginPage }, '/cliente/painel'));
    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(telaDeLogin(antiga.container)).toBeInTheDocument());
    expect(within(antiga.container).queryByText(AVISO)).not.toBeInTheDocument();

    const { pagina } = await paginaNovaDeLogin();
    expect(within(pagina.container).queryByText(AVISO)).not.toBeInTheDocument();
  });

  it('"Sair" com o acesso vencido e a renovação recusada no meio: sem o aviso na página nova', async () => {
    fetchMock.mockImplementation(recusaDaRenovacao({ success: false, code: 'SESSION_EXPIRED_ABSOLUTE' }));
    // POST /auth/logout leva 401; o interceptor do api.ts tenta renovar, a renovação é recusada e o logout falha.
    authAPI.logout.mockImplementation(async () => {
      await authService.refreshToken();
      throw new Error('Request failed with status code 401');
    });
    const antiga = render(site({ AuthProvider, ProtectedRoute, AuthRedirect, LoginPage }, '/cliente/painel'));
    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(telaDeLogin(antiga.container)).toBeInTheDocument());

    const { pagina } = await paginaNovaDeLogin();
    expect(within(pagina.container).queryByText(AVISO)).not.toBeInTheDocument();
  });
});
