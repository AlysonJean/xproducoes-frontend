// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { PageContextServer } from 'vike/types';
import { onRenderHtml } from '../../renderer/+onRenderHtml';
import { Page } from '../../pages/all/+Page';
import { STATIC_ROUTES } from '../utils/sitemapGenerator';

// P15 (aprovada em 02/11/2026): a página da proposta sai do SSR já com noindex e no-referrer, sem canonical nem
// og:url, e no layout mínimo (sem o cabeçalho de marketing e o WhatsApp flutuante do site). Mesmo arranjo de
// ssrNotFoundStatus.test.tsx: o app de verdade (pages/all/+Page.tsx) pelo onRenderHtml que o api/ssr.js usa em
// produção (pelo renderPage do Vike).
vi.mock('react-router-dom', async () => await vi.importActual('react-router'));
vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  apiFetch: vi.fn(() => new Promise(() => {})),
}));

// O documento que o onRenderHtml devolve é o template do escapeInject do Vike: { _template: { templateStrings,
// templateVariables } }, com { _escaped } nas partes já prontas (o Helmet e o HTML do app). Aqui ele vira texto.
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

describe('P15 — /proposta no SSR', () => {
  it.each(['/proposta', '/proposta/XP-ANA-20271220-2200-AB1'])('%s: noindex,nofollow e no-referrer no <head>, sem canonical nem og:url', async (url) => {
    const { head, notFound } = await renderAt(url);

    expect(notFound).toBe(false);
    expect(head).toMatch(/<meta[^>]*name="robots"[^>]*content="noindex,nofollow"/);
    expect(head).toMatch(/<meta[^>]*name="referrer"[^>]*content="no-referrer"/);
    expect(head).toMatch(/<title[^>]*>Proposta \| X Produções<\/title>/);
    expect(head).not.toMatch(/rel="canonical"/);
    expect(head).not.toMatch(/og:url|twitter:url/);
  }, 30_000);

  it('layout mínimo: sem o cabeçalho de marketing e o WhatsApp flutuante (que a home tem)', async () => {
    const home = await renderAt('/');
    const proposta = await renderAt('/proposta');
    const antiga = await renderAt('/proposta/XP-ANA-1');

    expect(home.html).toContain('Abrir menu');
    for (const { html } of [proposta, antiga]) {
      expect(html).not.toContain('Abrir menu');
      expect(html).not.toContain('Fale conosco no WhatsApp');
    }
    expect(proposta.html).toContain('Abrindo a proposta...');
    expect(antiga.html).toContain('Este link não vale mais. Peça um novo link à equipe.');
  }, 30_000);

  it('/proposta fica fora do sitemap', () => {
    expect(STATIC_ROUTES.some((route) => route.startsWith('/proposta'))).toBe(false);
  });
});
