// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { PageContextServer } from 'vike/types';
import { onRenderHtml } from '../../renderer/+onRenderHtml';
import { Page } from '../../pages/all/+Page';

// D12 (aprovada em 02/11/2026): o login com Google por redirecionamento saiu do servidor
// (/auth/oauth/google/authorize e /callback). A página /auth/oauth-concluido só recebia a volta dele
// (com o token no fragmento) e sai também; o site entra pelo botão do Google (/auth/social/google).
// Mesmo arranjo de ssrNotFoundStatus.test.tsx: o app de verdade, pelo onRenderHtml do SSR.
vi.mock('react-router-dom', async () => await vi.importActual('react-router'));
vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  apiFetch: vi.fn(() => new Promise(() => {})),
}));

async function notFoundRenderedAt(url: string) {
  const result = await onRenderHtml({ Page, pageProps: {}, urlOriginal: url, exports: {} } as unknown as PageContextServer);
  return (result as { pageContext?: { notFoundRendered?: boolean } }).pageContext?.notFoundRendered;
}

describe('D12 — página da volta do login por redirecionamento removida', () => {
  it('/auth/oauth-concluido mostra a página 404', async () => {
    expect(await notFoundRenderedAt('/auth/oauth-concluido')).toBe(true);
  });

  it('a tela de login continua existindo', async () => {
    expect(await notFoundRenderedAt('/login')).toBe(false);
  });
});
