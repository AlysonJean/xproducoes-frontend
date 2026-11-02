import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import FacebookAuthButton from '../FacebookAuthButton';

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

// Folga no tempo: o botão do Facebook importa a configuração da API só no clique.
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

describe('FacebookAuthButton — motivo da recusa do backend', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_FACEBOOK_APP_ID', 'fbapp');
    // SDK já carregado: o script está na página e o FB.login devolve um token.
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    document.body.appendChild(script);
    window.FB = {
      init: vi.fn(),
      getLoginStatus: vi.fn(),
      login: (callback) => callback({ authResponse: { accessToken: 't0k3n' } }),
    };
  });

  afterEach(() => {
    document.getElementById('facebook-jssdk')?.remove();
  });

  async function clickFacebook() {
    render(<FacebookAuthButton />);
    const button = screen.getByRole('button', { name: /Entrar com Facebook/ });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
  }

  it('mostra o texto que vem em `error` (antes: "Falha ao conectar com Facebook.")', async () => {
    const motivo = 'Já existe uma conta com este e-mail. Por segurança, entre com e-mail e senha; se não tiver senha, use "Esqueci minha senha".';
    vi.spyOn(axios, 'post').mockRejectedValue(
      backendRefusal(403, { success: false, error: motivo, code: 'SOCIAL_ACCOUNT_NOT_LINKED' }),
    );

    await clickFacebook();

    await notifiedError(motivo);
  });

  it('quando a resposta traz `message` (limitador de tentativas), ela continua tendo prioridade', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(
      backendRefusal(429, { error: 'Too Many Requests', message: 'Muitas tentativas de autenticação. Aguarde antes de tentar novamente.' }),
    );

    await clickFacebook();

    await notifiedError('Muitas tentativas de autenticação. Aguarde antes de tentar novamente.');
  });
});
