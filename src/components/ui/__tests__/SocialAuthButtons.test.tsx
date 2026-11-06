import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios, { AxiosError, AxiosHeaders } from 'axios';

// Achado (auditoria ponta a ponta): o login social passou a recusar e-mail não confirmado pelo
// Google e conta já existente que não é deste Facebook, com o motivo no corpo da resposta. O
// globalErrorHandler do backend manda esse motivo em `error`, e os botões só liam `message`: a
// pessoa via "Falha ao conectar..." em vez de "entre com e-mail e senha".
const { addNotification } = vi.hoisted(() => ({ addNotification: vi.fn() }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
// Como a biblioteca faz depois do popup do Google: chama o onSuccess com o access token.
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useGoogleLogin: (options: { onSuccess: (token: { access_token: string }) => void }) => () =>
    options.onSuccess({ access_token: 't0k3n' }),
}));

// Recusa como o backend responde: status de erro e o corpo montado pelo globalErrorHandler.
function backendRefusal(status: number, data: Record<string, unknown>) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, undefined, {
    status, statusText: '', headers: {}, config, data,
  });
}

// Folga no tempo: o envio ao backend acontece depois do clique.
const notifiedError = (message: string) =>
  waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message })), { timeout: 3000 });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  addNotification.mockReset();
});

describe('GoogleAuthButton — motivo da recusa do backend', () => {
  it('mostra o texto que vem em `error` (antes: "Falha ao conectar: Request failed with status code 401")', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'our-app');
    // O client id é lido quando o módulo carrega: importa depois de definir a variável.
    const { default: GoogleAuthButton } = await import('../GoogleAuthButton');
    const motivo = 'O Google ainda não confirmou este e-mail. Confirme-o na sua Conta Google ou entre com e-mail e senha.';
    vi.spyOn(axios, 'post').mockRejectedValue(backendRefusal(401, { success: false, error: motivo }));

    render(<GoogleAuthButton />);
    fireEvent.click(screen.getByRole('button', { name: /Entrar com Google/ }));

    await notifiedError(motivo);
  });
});
