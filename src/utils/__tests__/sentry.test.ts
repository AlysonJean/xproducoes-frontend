import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BrowserOptions, ErrorEvent } from '@sentry/react';

// O initSentry entrega ao SDK os ganchos beforeSend/beforeBreadcrumb; o init falso guarda essas opções.
const { init } = vi.hoisted(() => ({ init: vi.fn() }));
vi.mock('@sentry/react', () => ({
  init,
  setUser: vi.fn(),
  setTag: vi.fn(),
  setContext: vi.fn(),
  ErrorBoundary: () => null,
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

// Achado (revisão antes do deploy): o Sentry recebia a URL inteira da página (request.url, Referer)
// e dos breadcrumbs de navegação e de fetch, com o token, o e-mail e o código dos links de e-mail.
describe('initSentry - URLs enviadas ao Sentry', () => {
  beforeEach(() => {
    vi.resetModules();
    init.mockClear();
    vi.stubEnv('VITE_SENTRY_DSN', 'https://dsn.test/1');
    // Em 'development' o beforeSend descarta todo evento; aqui interessa o evento que sai.
    vi.stubEnv('VITE_SENTRY_ENVIRONMENT', 'production');
  });
  afterEach(() => vi.unstubAllEnvs());

  // O DSN e o ambiente são lidos quando o módulo carrega, por isso o import vem depois do stubEnv.
  const loadOptions = async (): Promise<BrowserOptions> => {
    const { initSentry } = await import('../sentry');
    initSentry();
    return init.mock.calls[0][0] as BrowserOptions;
  };

  it('beforeSend tira token, email e code da URL da página, do Referer e do frame', async () => {
    const { beforeSend } = await loadOptions();
    const event: ErrorEvent = {
      type: undefined,
      request: {
        url: 'https://xproducoeseeventos.com.br/redefinir-senha?token=abc123&utm_source=email',
        headers: { Referer: 'https://xproducoeseeventos.com.br/cadastro-convite?token=abc123&email=fulano%40exemplo.com' },
      },
      exception: {
        values: [
          {
            type: 'Error',
            value: 'falhou',
            stacktrace: { frames: [{ filename: 'https://xproducoeseeventos.com.br/auth/oauth-concluido#token=abc123' }] },
          },
        ],
      },
    };

    const sent = await beforeSend?.(event, {});

    expect(sent?.request?.url).toBe('https://xproducoeseeventos.com.br/redefinir-senha?utm_source=email');
    expect(sent?.request?.headers?.Referer).toBe('https://xproducoeseeventos.com.br/cadastro-convite');
    expect(sent?.exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename).toBe(
      'https://xproducoeseeventos.com.br/auth/oauth-concluido',
    );
    expect(JSON.stringify(sent)).not.toMatch(/abc123|fulano/);
  });

  it('beforeBreadcrumb tira os parâmetros da navegação e da requisição à API, sem alterar o objeto original', async () => {
    const { beforeBreadcrumb } = await loadOptions();

    const navigation = beforeBreadcrumb?.({
      category: 'navigation',
      data: { from: '/redefinir-senha?token=abc123', to: '/login' },
    });
    // No fetch com erro, o SDK usa o próprio objeto da requisição como `data`: ele não pode mudar.
    const requestData = { method: 'GET', url: '/api/v1/auth/verify-email?token=abc123', status_code: 200 };
    const request = beforeBreadcrumb?.({ category: 'fetch', type: 'http', data: requestData });

    expect(navigation?.data).toEqual({ from: '/redefinir-senha', to: '/login' });
    expect(request?.data).toEqual({ method: 'GET', url: '/api/v1/auth/verify-email', status_code: 200 });
    expect(requestData.url).toBe('/api/v1/auth/verify-email?token=abc123');
  });
});

// D7 (aprovada em 02/11/2026): "tiro IP e e-mail do Sentry do site". O init ia com sendDefaultPii: true (o SDK guarda o
// IP de quem teve o erro) e o objeto do app tinha um setUserContext, que mandaria id, e-mail, nome e papel de quem
// estava logado (nenhuma tela o chamava).
describe('initSentry - sem IP nem usuário', () => {
  beforeEach(() => {
    vi.resetModules();
    init.mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it('o SDK é iniciado com sendDefaultPii: false', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://dsn.test/1');
    vi.stubEnv('VITE_SENTRY_ENVIRONMENT', 'production');
    const { initSentry } = await import('../sentry');
    initSentry();

    expect(init).toHaveBeenCalledTimes(1);
    expect((init.mock.calls[0][0] as BrowserOptions).sendDefaultPii).toBe(false);
  });

  it('o objeto do app não tem mais setUserContext, com ou sem DSN', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://dsn.test/1');
    vi.stubEnv('VITE_SENTRY_ENVIRONMENT', 'production');
    const comDsn = (await import('../sentry')).initSentry();
    expect(comDsn).not.toHaveProperty('setUserContext');

    vi.resetModules();
    vi.stubEnv('VITE_SENTRY_DSN', '');
    const semDsn = (await import('../sentry')).initSentry();
    expect(semDsn).not.toHaveProperty('setUserContext');
    expect(semDsn).toHaveProperty('captureException');
  });
});
