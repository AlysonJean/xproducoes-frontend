import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Sem sessão, cada página aberta por visitante fazia GET /auth/profile (401) + POST
// /auth/refresh (400): log poluído no Render e requisições a mais pelo proxy da Vercel (Free).
// O backend agora grava o cookie-sinal x_session junto com os de login.
function clearCookies() {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
}

describe('authService.refreshToken + sinal de sessão', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    clearCookies();
    sessionStorage.clear();
    fetchMock.mockReset().mockResolvedValue({ ok: false, status: 400, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sem sinal: tenta uma vez por aba (sessões antigas) e depois não chama mais o servidor', async () => {
    const { authService } = await import('../../services/authservice');
    await authService.refreshToken();
    await authService.refreshToken();
    await authService.refreshToken();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('com sinal: sempre tenta renovar', async () => {
    document.cookie = 'x_session=1; path=/';
    const { authService } = await import('../../services/authservice');
    await authService.refreshToken();
    await authService.refreshToken();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shouldTrySessionRestore: com sinal sempre; sem sinal só até a primeira tentativa da aba', async () => {
    const { shouldTrySessionRestore, markSessionRestoreTried } = await import('../sessionHint');
    expect(shouldTrySessionRestore()).toBe(true);
    markSessionRestoreTried();
    expect(shouldTrySessionRestore()).toBe(false);
    document.cookie = 'x_session=1; path=/';
    expect(shouldTrySessionRestore()).toBe(true);
  });
});
