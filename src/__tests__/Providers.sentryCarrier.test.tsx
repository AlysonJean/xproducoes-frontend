import { describe, it, expect, vi, beforeEach } from 'vitest';

// O objeto que o initSentry do app devolve (API usada pelo logger e pelo ErrorBoundary).
const { appSentry } = vi.hoisted(() => ({
  appSentry: { ErrorBoundary: ({ children }: { children: unknown }) => children, captureException: vi.fn() },
}));
vi.mock('../utils/sentry', () => ({ initSentry: () => appSentry }));
vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }));
vi.mock('../hooks/useWebVitals', () => ({ useWebVitals: () => undefined }));

type SentryGlobals = { __SENTRY__?: unknown; __XP_SENTRY__?: unknown };

// Achado (revisão antes do deploy): o Providers gravava o objeto do app em window.__SENTRY__, que é
// o global onde o próprio SDK do Sentry guarda o client e os escopos. Trocado logo depois do init,
// o client sumia e nenhum erro chegava ao Sentry — nem do ErrorBoundary, nem do logger.
describe('Providers — global do Sentry', () => {
  beforeEach(() => {
    vi.resetModules();
    appSentry.captureException.mockClear();
  });

  it('não sobrescreve o global do SDK (window.__SENTRY__) e expõe o do app em __XP_SENTRY__', async () => {
    const sdkCarrier = { version: 'sdk' };
    (window as unknown as SentryGlobals).__SENTRY__ = sdkCarrier;

    await import('../Providers');

    expect((window as unknown as SentryGlobals).__SENTRY__).toBe(sdkCarrier);
    expect((window as unknown as SentryGlobals).__XP_SENTRY__).toBe(appSentry);
  });

  it('o logger manda o erro pelo objeto do app', async () => {
    await import('../Providers');
    const { logger } = await import('../utils/logger');
    const error = new Error('falhou');

    logger.error('Falha ao salvar', 'Teste', error);

    expect(appSentry.captureException).toHaveBeenCalledWith(error, expect.anything());
  });
});
