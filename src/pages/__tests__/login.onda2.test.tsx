import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

// Onda 2 da auditoria de 19/11: F1-03 (a tela de login era desmontada no meio do envio: o erro sumia, o e-mail zerava e o
// "Reenviar confirmação" não aparecia), F1-06 (depois de entrar, a pessoa não voltava à página que pediu) e F1-07 (a
// renovação recusada levava ao /login até em página pública). AuthContext, guardas, authservice e LoginPage de verdade;
// só a rede é simulada.
const { authAPI, apiFetch, addNotification } = vi.hoisted(() => ({
  authAPI: { getProfile: vi.fn(), logout: vi.fn() },
  apiFetch: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('../../services/api', () => ({ authAPI, apiFetch }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../components/ui/GoogleAuthButton', () => ({ default: () => null }));
vi.mock('../../components/ui/PageLoadingSpinner', () => ({ PageLoadingSpinner: () => <p>Carregando</p> }));

import { AuthProvider } from '../../contexts/AuthContext';
import { ProtectedRoute, AuthRedirect } from '../../routes/RouteGuards';
import { LoginPage } from '../LoginPage';
import { authService } from '../../services/authservice';
import { safeNextPath, loginPathFor } from '../../utils/authUtils';

const fetchMock = vi.fn();
const realLocation = window.location;
const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });

const Onde = () => {
  const { pathname, search } = useLocation();
  return <p data-testid="onde">{pathname}{search}</p>;
};

const site = (inicio: string) => (
  <AuthProvider>
    <MemoryRouter initialEntries={[inicio]}>
      <Routes>
        <Route path="/admin/reservas/:id" element={<ProtectedRoute adminOnly><p>Reserva no painel</p></ProtectedRoute>} />
        <Route path="/admin/painel" element={<ProtectedRoute adminOnly><p>Painel</p></ProtectedRoute>} />
        <Route path="/login" element={<AuthRedirect><LoginPage /><Onde /></AuthRedirect>} />
      </Routes>
    </MemoryRouter>
  </AuthProvider>
);

const entrar = (email: string, senha: string) => {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } });
  fireEvent.click(screen.getByRole('button', { name: /^Entrar$/ }));
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  document.cookie = 'x_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  vi.stubGlobal('fetch', fetchMock);
  authAPI.getProfile.mockRejectedValue(Object.assign(new Error('401'), { response: { status: 401 } }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
});

describe('F1-06: o login volta para a página pedida', () => {
  it('safeNextPath só aceita caminho interno', () => {
    expect(safeNextPath('?next=%2Fadmin%2Freservas%2FXP-1')).toBe('/admin/reservas/XP-1');
    expect(safeNextPath('?next=%2Fcliente%2Freservas%3Faba%3Dpagamento')).toBe('/cliente/reservas?aba=pagamento');
    for (const ruim of ['?next=https%3A%2F%2Fmal.test', '?next=%2F%2Fmal.test', '?next=%2F%5Cmal.test', '?next=%2Flogin', '?next=', '']) {
      expect(safeNextPath(ruim)).toBeNull();
    }
    expect(loginPathFor('/admin/reservas/XP-1?x=1')).toBe('/login?next=%2Fadmin%2Freservas%2FXP-1%3Fx%3D1');
  });

  it('a página protegida leva ao login com o destino, e depois de entrar a pessoa chega nele', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes('/auth/login')
        ? json(200, { user: { id: 'a1', name: 'Dona', email: 'dona@x.test', role: 'ADMIN' }, redirectTo: '/admin/painel' })
        : json(401, {}));
    render(site('/admin/reservas/XP-1'));

    expect(await screen.findByTestId('onde')).toHaveTextContent('/login?next=%2Fadmin%2Freservas%2FXP-1');
    entrar('dona@x.test', 'SenhaCerta1');

    expect(await screen.findByText('Reserva no painel')).toBeInTheDocument();
  });
});

describe('F1-03: a tela de login fica montada durante o envio', () => {
  it('senha errada: o erro aparece e o e-mail digitado continua no campo', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes('/auth/login') ? json(401, { error: 'Credenciais inválidas' }) : json(401, {}));
    render(site('/login'));
    await screen.findByLabelText('E-mail');

    entrar('dona@x.test', 'SenhaErrada1');

    expect(await screen.findByText('Credenciais inválidas')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveValue('dona@x.test');
    expect(screen.queryByText('Carregando')).not.toBeInTheDocument();
  });

  it('e-mail não confirmado: o "Reenviar confirmação" aparece', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes('/auth/login') ? json(403, { error: 'E-mail não verificado.', code: 'EMAIL_NOT_VERIFIED' }) : json(401, {}));
    render(site('/login'));
    await screen.findByLabelText('E-mail');
    entrar('ana@x.test', 'SenhaCerta1');
    expect(await screen.findByRole('button', { name: 'Reenviar confirmação' })).toBeInTheDocument();
  });
});

describe('F1-07: renovação recusada', () => {
  const recusar = () => fetchMock.mockResolvedValue(json(401, { success: false, code: 'SESSION_EXPIRED_ABSOLUTE' }));
  const onde = (pathname: string, search = '', hash = '') =>
    Object.defineProperty(window, 'location', { configurable: true, value: { pathname, search, hash, href: `${pathname}${search}${hash}` } });

  it.each([
    ['/', '', ''],
    ['/kits/kit-festa', '', ''],
    ['/proposta', '', '#token=p1.TESTE'],
  ])('em página pública (%s%s%s): a sessão é limpa e a pessoa fica onde está, sem aviso', async (pathname, search, hash) => {
    onde(pathname, search, hash);
    const saiu = vi.fn();
    window.addEventListener('auth:logout', saiu);
    recusar();

    await authService.refreshToken();

    expect(window.location.href).toBe(`${pathname}${search}${hash}`);
    expect(saiu).toHaveBeenCalled();
    expect(sessionStorage.getItem('xp_session_expired')).toBeNull();
    window.removeEventListener('auth:logout', saiu);
  });

  it('em página que exige conta: vai ao login com o aviso e com o destino', async () => {
    onde('/admin/reservas/XP-1', '?aba=pagamento');
    recusar();
    await authService.refreshToken();
    expect(window.location.href).toBe('/login?next=%2Fadmin%2Freservas%2FXP-1%3Faba%3Dpagamento');
    expect(sessionStorage.getItem('xp_session_expired')).toBe('1');
  });

  it('"Sair" normal continua indo ao login, de qualquer página', async () => {
    onde('/kits');
    authService.logout();
    await waitFor(() => expect(window.location.href).toBe('/login'));
  });
});
