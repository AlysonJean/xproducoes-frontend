import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';

// Onda 4 da auditoria de 19/11, primeiro lote do site: a sessão que não cai numa falha passageira (F1-13), o tema escuro
// sem piscar claro (F1-22) e o erro de hidratação recuperado que agora vai ao log (F1-21).
const { authAPI, hydrateRoot, loggerWarn } = vi.hoisted(() => ({
  authAPI: { getProfile: vi.fn(), logout: vi.fn() },
  hydrateRoot: vi.fn(),
  loggerWarn: vi.fn(),
}));
vi.mock('../services/api', () => ({ authAPI }));
vi.mock('react-dom/client', () => ({ default: { hydrateRoot }, hydrateRoot }));
vi.mock('../../renderer/PageShell', () => ({ PageShell: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../utils/logger', () => ({ logger: { warn: loggerWarn, error: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { AuthProvider, useAuth, PROFILE_TIMEOUT_MS, PROFILE_RETRY_DELAY_MS } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { onRenderClient } from '../../renderer/+onRenderClient';

function Probe() {
  const { isLoading, user } = useAuth();
  return <p>{isLoading ? 'carregando' : user ? `logado: ${user.name}` : 'deslogado'}</p>;
}
const perfil = { data: { id: 'u1', name: 'Cliente', email: 'c@t.com', role: 'CLIENT' } };
const falha = (status?: number) => Object.assign(new Error(status ? `HTTP ${status}` : 'Network Error'), status ? { response: { status } } : {});

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.setItem('xp_session_restore_tried', '1');
  document.cookie = 'x_session=1; path=/';
});

describe('F1-13: abrir a sessão', () => {
  it('prazo de 8 s por tentativa e espera de 1,5 s antes da segunda', () => {
    expect(PROFILE_TIMEOUT_MS).toBe(8000);
    expect(PROFILE_RETRY_DELAY_MS).toBe(1500);
  });

  it('502 do proxy na primeira: tenta de novo e a pessoa continua logada (antes ia para /login)', async () => {
    authAPI.getProfile.mockRejectedValueOnce(falha(502)).mockResolvedValueOnce(perfil);
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText('logado: Cliente', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(authAPI.getProfile).toHaveBeenCalledTimes(2);
    expect(authAPI.getProfile).toHaveBeenNthCalledWith(1, { timeout: 8000 });
    expect(authAPI.getProfile).toHaveBeenNthCalledWith(2, { timeout: 8000 });
  });

  it('401 (sem sessão): não repete', async () => {
    authAPI.getProfile.mockRejectedValue(falha(401));
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText('deslogado')).toBeInTheDocument();
    expect(authAPI.getProfile).toHaveBeenCalledTimes(1);
  });

  it('falha de rede duas vezes: desiste depois da segunda', async () => {
    authAPI.getProfile.mockRejectedValue(falha());
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText('deslogado', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(authAPI.getProfile).toHaveBeenCalledTimes(2);
  });
});

describe('F1-22: tema escuro sem piscar', () => {
  const root = document.documentElement;
  const html = readFileSync(resolve(__dirname, '../../renderer/+onRenderHtml.tsx'), 'utf8');
  const script = /<script>(try\{var t=localStorage\.getItem\('theme'\)[\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';
  const prefereEscuro = (matches: boolean) =>
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const rodarScript = () => new Function(script)();

  beforeEach(() => {
    localStorage.clear();
    root.className = '';
    root.removeAttribute('data-theme');
    root.style.colorScheme = '';
  });
  afterEach(() => vi.unstubAllGlobals());

  it('o script do <head> vem antes das fontes e aplica o tema salvo ou o do aparelho', () => {
    expect(script).not.toBe('');
    expect(html.indexOf(script)).toBeLessThan(html.indexOf('fonts.googleapis.com/css2'));

    prefereEscuro(false);
    localStorage.setItem('theme', 'dark');
    rodarScript();
    expect(root).toHaveClass('dark');
    expect(root).toHaveAttribute('data-theme', 'dark');
    expect(root.style.colorScheme).toBe('dark');

    root.className = '';
    prefereEscuro(true);
    localStorage.setItem('theme', 'light');
    rodarScript();
    expect(root).toHaveClass('light');

    root.className = '';
    localStorage.setItem('theme', 'system');
    rodarScript();
    expect(root).toHaveClass('dark');

    root.className = '';
    localStorage.removeItem('theme');
    prefereEscuro(false);
    rodarScript();
    expect(root).toHaveClass('light');
  });

  it('com o "dark" já posto pelo script, o ThemeProvider não aplica "light" no meio do caminho', async () => {
    prefereEscuro(false);
    localStorage.setItem('theme', 'dark');
    rodarScript();
    const add = vi.spyOn(root.classList, 'add');
    render(<ThemeProvider><p>página</p></ThemeProvider>);
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(add.mock.calls.flat()).not.toContain('light');
    expect(root).toHaveClass('dark');
    expect(root).not.toHaveClass('light');
    add.mockRestore();
  });

  it('sem o script (armazenamento bloqueado ou teste), o tema ainda é aplicado depois de resolvido', async () => {
    prefereEscuro(true);
    render(<ThemeProvider><p>página</p></ThemeProvider>);
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(root).toHaveClass('dark');
    expect(root).toHaveAttribute('data-theme', 'dark');
  });
});

describe('F1-21: erro de hidratação recuperado', () => {
  it('vai ao log com a pilha do componente (antes sumia)', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await onRenderClient({ Page: () => null, pageProps: {} } as never);
    const options = hydrateRoot.mock.calls[0][2] as { onRecoverableError: (e: unknown, info: { componentStack?: string }) => void };
    const error = new Error('Hydration failed');
    options.onRecoverableError(error, { componentStack: '\n    at Header' });
    expect(loggerWarn).toHaveBeenCalledWith('Erro de hidratação recuperado', 'SSR', { error, componentStack: '\n    at Header' });
  });
});
