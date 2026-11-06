import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { authAPI, authService } = vi.hoisted(() => ({
  authAPI: { getProfile: vi.fn(), logout: vi.fn() },
  authService: { logout: vi.fn(), refreshToken: vi.fn() },
}));
vi.mock('../../services/api', () => ({ authAPI }));
vi.mock('../../services/authservice', () => ({ authService }));

import { AuthProvider, useAuth } from '../AuthContext';

// N1 (02/11/2026): o servidor recusa o login com { success: false, error, code } (globalErrorHandler).
// O site só lia `message`: toda recusa aparecia como "Login failed", e o código EMAIL_NOT_VERIFIED se
// perdia (a tela não tinha como oferecer "Reenviar confirmação").
function Entrar() {
  const { loginWithCredentials } = useAuth();
  return (
    <button
      onClick={() =>
        loginWithCredentials?.({ email: 'Ana@Exemplo.test', password: 'x' }).catch((e: Error & { code?: string }) => {
          document.body.setAttribute('data-erro', e.message);
          document.body.setAttribute('data-codigo', e.code ?? '');
        })
      }
    >
      Entrar
    </button>
  );
}

const responder = (status: number, corpo: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }));

describe('AuthContext.loginWithCredentials — motivo e código da recusa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authAPI.getProfile.mockRejectedValue(new Error('sem sessão'));
    document.body.removeAttribute('data-erro');
    document.body.removeAttribute('data-codigo');
  });
  afterEach(() => vi.restoreAllMocks());

  it('e-mail não confirmado: o texto do servidor e o código EMAIL_NOT_VERIFIED chegam à tela', async () => {
    responder(403, { success: false, error: 'E-mail não verificado. Verifique sua caixa de entrada.', code: 'EMAIL_NOT_VERIFIED' });
    render(<AuthProvider><Entrar /></AuthProvider>);

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(document.body.getAttribute('data-codigo')).toBe('EMAIL_NOT_VERIFIED'));
    expect(document.body.getAttribute('data-erro')).toBe('E-mail não verificado. Verifique sua caixa de entrada.');
  });

  it('senha errada: mostra o texto do servidor, não "Login failed"', async () => {
    responder(401, { success: false, error: 'Credenciais inválidas' });
    render(<AuthProvider><Entrar /></AuthProvider>);

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(document.body.getAttribute('data-erro')).toBe('Credenciais inválidas'));
    expect(document.body.getAttribute('data-codigo')).toBe('');
  });
});
