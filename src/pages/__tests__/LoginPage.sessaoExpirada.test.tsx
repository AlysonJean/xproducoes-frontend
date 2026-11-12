import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Decisão de Alyson (12/11/2026, "faça no padrão dos grandes aplicativos"): a sessão tem prazo máximo (30 dias para
// cliente, 7 para a equipe). Quando a renovação é recusada (401 SESSION_EXPIRED_ABSOLUTE ou outra recusa do
// /auth/refresh), a pessoa cai na tela de login, que mostra UMA vez "Sua sessão expirou por segurança. Entre de novo.".
// O "Sair" normal não mostra o aviso. Antes, a pessoa só era jogada no login, sem explicação.
// authservice de verdade (fetch simulado); a tela de login com o contexto simulado, como nos outros testes dela.
const { loginWithCredentials, apiFetch, addNotification } = vi.hoisted(() => ({
  loginWithCredentials: vi.fn(),
  apiFetch: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ loginWithCredentials }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ loginWithCredentials }) }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('../../components/ui/GoogleAuthButton', () => ({ default: () => null }));

import { LoginPage } from '../LoginPage';
import { authService } from '../../services/authservice';

const AVISO = 'Sua sessão expirou por segurança. Entre de novo.';
const fetchMock = vi.fn();
const realLocation = window.location;

const resposta = (status: number, corpo: unknown = {}) => ({ ok: status < 400, status, json: async () => corpo });
const abrirLogin = () => render(<MemoryRouter><LoginPage /></MemoryRouter>);

function clearCookies() {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
}

describe('tela de login depois de a sessão expirar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCookies();
    sessionStorage.clear();
    // Há sessão (cookie-sinal x_session): a renovação é tentada.
    document.cookie = 'x_session=1; path=/';
    vi.stubGlobal('fetch', fetchMock);
    // A pessoa está no painel quando o acesso vence.
    Object.defineProperty(window, 'location', { configurable: true, value: { pathname: '/cliente/painel', href: '/cliente/painel' } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  it('prazo máximo vencido (401 SESSION_EXPIRED_ABSOLUTE): vai para o login, que mostra o aviso uma vez só', async () => {
    fetchMock.mockResolvedValue(resposta(401, { success: false, code: 'SESSION_EXPIRED_ABSOLUTE', error: AVISO }));

    await expect(authService.refreshToken()).resolves.toBeNull();
    expect(window.location.href).toBe('/login');

    // A página nova de /login, o carregamento que o authservice pediu: módulos novos (revisão: a tela de login que
    // aparece ainda na página antiga não apaga o aviso; ver LoginPage.sessaoExpiradaPainel.test.tsx).
    vi.resetModules();
    const { LoginPage: LoginDaPaginaNova } = await import('../LoginPage');
    const primeira = render(<MemoryRouter><LoginDaPaginaNova /></MemoryRouter>);
    expect(await screen.findByText(AVISO)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(AVISO);
    primeira.unmount();

    // Recarregar a tela de login não repete o aviso.
    render(<MemoryRouter><LoginDaPaginaNova /></MemoryRouter>);
    await waitFor(() => expect(screen.getByLabelText('E-mail')).toBeInTheDocument());
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
  });

  it('outra recusa da renovação (sessão encerrada, 401 sem código): o mesmo aviso', async () => {
    fetchMock.mockResolvedValue(resposta(401, { success: false, error: 'Refresh token inválido' }));
    await authService.refreshToken();

    abrirLogin();
    expect(await screen.findByText(AVISO)).toBeInTheDocument();
  });

  it('falha passageira na renovação (503 ou rede): não encerra a sessão nem marca aviso', async () => {
    fetchMock.mockResolvedValueOnce(resposta(503)).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await authService.refreshToken();
    await authService.refreshToken();
    expect(window.location.href).toBe('/cliente/painel');

    abrirLogin();
    await waitFor(() => expect(screen.getByLabelText('E-mail')).toBeInTheDocument());
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
  });

  it('"Sair" normal: vai para o login sem o aviso', async () => {
    authService.logout();
    expect(window.location.href).toBe('/login');

    abrirLogin();
    await waitFor(() => expect(screen.getByLabelText('E-mail')).toBeInTheDocument());
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
  });

  it('renovação recusada durante o próprio "Sair" (acesso já vencido): o "Sair" apaga o aviso', async () => {
    fetchMock.mockResolvedValue(resposta(401, { code: 'SESSION_EXPIRED_ABSOLUTE' }));
    await authService.refreshToken(); // o POST /auth/logout levou 401 e o interceptor tentou renovar
    authService.logout(); // AuthContext.logout chama em seguida

    abrirLogin();
    await waitFor(() => expect(screen.getByLabelText('E-mail')).toBeInTheDocument());
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
  });

  it('o aviso sai quando a pessoa tenta entrar', async () => {
    fetchMock.mockResolvedValue(resposta(401, { code: 'SESSION_EXPIRED_ABSOLUTE' }));
    await authService.refreshToken();
    loginWithCredentials.mockRejectedValue(new Error('Credenciais inválidas'));

    abrirLogin();
    expect(await screen.findByText(AVISO)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@exemplo.test' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaQualquer1' } });
    fireEvent.click(screen.getByRole('button', { name: /^Entrar$/ }));

    expect(await screen.findByText('Credenciais inválidas')).toBeInTheDocument();
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
  });
});
