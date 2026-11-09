// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { PageContextServer } from 'vike/types';
import { onRenderHtml } from '../../renderer/+onRenderHtml';
import { Page } from '../../pages/all/+Page';
import { STATIC_ROUTES, generateSitemap } from '../utils/sitemapGenerator';

// D8c (aprovada em 02/11/2026), parte 2: a confirmação da exclusão da conta pelo link do e-mail
// (/lgpd/confirmar-exclusao#token=...) sai do SSR já com noindex e no-referrer, no layout mínimo (sem o cabeçalho de
// marketing e o WhatsApp flutuante), sem chamar a API e fora do sitemap. Mesmo arranjo de p15.propostaNoSsr.test.tsx:
// o app de verdade (pages/all/+Page.tsx) pelo onRenderHtml que o api/ssr.js usa em produção (pelo renderPage do Vike).
vi.mock('react-router-dom', async () => await vi.importActual('react-router'));
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn(() => new Promise(() => {})) }));
vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  apiFetch,
}));

function documentText(part: unknown): string {
  if (part && typeof part === 'object' && '_escaped' in part) return String((part as { _escaped: unknown })._escaped);
  if (part && typeof part === 'object' && '_template' in part) {
    const { templateStrings, templateVariables } = (part as { _template: { templateStrings: string[]; templateVariables: unknown[] } })._template;
    return templateStrings.map((chunk, i) => chunk + (i < templateVariables.length ? documentText(templateVariables[i]) : '')).join('');
  }
  return String(part ?? '');
}

async function renderAt(url: string) {
  const result = await onRenderHtml({ Page, pageProps: {}, urlOriginal: url, exports: {} } as unknown as PageContextServer);
  const { documentHtml, pageContext } = result as { documentHtml: unknown; pageContext?: { notFoundRendered?: boolean } };
  const html = documentText(documentHtml);
  return { html, head: html.slice(0, html.indexOf('</head>')), notFound: pageContext?.notFoundRendered };
}

describe('D8c — /lgpd/confirmar-exclusao no SSR', () => {
  it('noindex,nofollow e no-referrer no <head>, título próprio, sem canonical; nenhuma chamada à API', async () => {
    const { head, html, notFound } = await renderAt('/lgpd/confirmar-exclusao');

    expect(notFound).toBe(false);
    expect(head).toMatch(/<meta[^>]*name="robots"[^>]*content="noindex,nofollow"/);
    expect(head).toMatch(/<meta[^>]*name="referrer"[^>]*content="no-referrer"/);
    expect(head).toMatch(/<title[^>]*>Confirmar exclusão da conta \| X Produções<\/title>/);
    expect(head).not.toMatch(/rel="canonical"/);
    expect(html).toContain('Abrindo o link...');
    expect(html).not.toContain('Abrir menu');
    expect(html).not.toContain('Fale conosco no WhatsApp');
    expect(apiFetch).not.toHaveBeenCalled();
  }, 30_000);

  it('fica fora do sitemap', async () => {
    expect(STATIC_ROUTES.some((route) => route.startsWith('/lgpd'))).toBe(false);
    expect(await generateSitemap()).not.toContain('confirmar-exclusao');
  });
});
