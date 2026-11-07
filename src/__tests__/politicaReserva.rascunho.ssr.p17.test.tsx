// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { PageContextServer } from 'vike/types';
import { onRenderHtml } from '../../renderer/+onRenderHtml';
import { Page } from '../../pages/all/+Page';
import { generateSitemap, STATIC_ROUTES } from '../utils/sitemapGenerator';
import {
  RESERVATION_POLICY_DRAFT_NOTICE,
  RESERVATION_POLICY_PATH,
  RESERVATION_POLICY_PUBLISHED,
} from '../data/reservationPolicy';

// P17 (aprovada em 02/11/2026): enquanto a política de reserva não estiver publicada, ela abre no endereço, com o
// aviso de rascunho e noindex no HTML que o SSR entrega, mas fica fora do sitemap e sem link em nenhuma página.
// Mesmo arranjo de ssrNotFoundStatus.test.tsx: o app de verdade, pelo onRenderHtml que o api/ssr.js usa na Vercel.
vi.mock('react-router-dom', async () => await vi.importActual('react-router'));
vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  apiFetch: vi.fn(() => new Promise(() => {})),
}));

// O documentHtml do onRenderHtml é o modelo do escapeInject do Vike; aqui vira texto (as partes escapadas e os
// fragmentos aninhados, na ordem em que o Vike as junta).
type VikeHtml = { _escaped?: string; _template?: { templateStrings: readonly string[]; templateVariables: readonly unknown[] } };
function htmlOf(part: unknown): string {
  if (typeof part === 'string') return part;
  const html = part as VikeHtml | null | undefined;
  if (typeof html?._escaped === 'string') return html._escaped;
  if (html?._template) {
    const { templateStrings, templateVariables } = html._template;
    return templateStrings.map((text, i) => text + (i < templateVariables.length ? htmlOf(templateVariables[i]) : '')).join('');
  }
  return part == null ? '' : String(part);
}

async function ssr(url: string) {
  const result = (await onRenderHtml({ Page, pageProps: {}, urlOriginal: url, exports: {} } as unknown as PageContextServer)) as {
    documentHtml: unknown;
    pageContext?: { notFoundRendered?: boolean };
  };
  const html = htmlOf(result.documentHtml);
  return {
    head: html.slice(html.indexOf('<head>'), html.indexOf('</head>')),
    body: html.slice(html.indexOf('<body>')),
    notFound: result.pageContext?.notFoundRendered,
  };
}

describe('P17 — política de reserva em rascunho (SSR, sitemap e links)', () => {
  it('a chave da publicação está desligada', () => {
    expect(RESERVATION_POLICY_PUBLISHED).toBe(false);
  });

  it('/politica-de-reserva abre a página (não a 404 da landing de SEO local), com noindex, nofollow no <head> e o aviso no corpo', async () => {
    const page = await ssr(RESERVATION_POLICY_PATH);

    expect(page.notFound).toBe(false);
    expect(page.head).toMatch(/<title[^>]*>Política de reserva e cancelamento \| X Produções<\/title>/);
    expect(page.head).toMatch(/<meta[^>]*name="robots"[^>]*content="noindex, nofollow"/);
    expect(page.body).toMatch(/<h1[^>]*>Política de reserva e cancelamento<\/h1>/);
    expect(page.body).toContain(RESERVATION_POLICY_DRAFT_NOTICE);
  });

  it('nenhuma página liga para o rascunho: rodapé, Termos, FAQ, pedido de orçamento, briefing, ajuda e a própria página', async () => {
    for (const url of ['/', '/termos', '/faq', '/orcamento', '/briefing', '/ajuda', '/contato', '/garantia', RESERVATION_POLICY_PATH]) {
      const { body } = await ssr(url);
      // O rodapé está no HTML (o link da Privacidade aparece), então a falta do link da política é de verdade.
      expect({ url, rodape: body.includes('href="/privacidade"') }).toEqual({ url, rodape: true });
      expect({ url, link: body.includes(`href="${RESERVATION_POLICY_PATH}"`) }).toEqual({ url, link: false });
    }
  }, 30_000);

  it('fica fora do sitemap', async () => {
    expect(STATIC_ROUTES).not.toContain(RESERVATION_POLICY_PATH);
    const xml = await generateSitemap();
    expect(xml).toContain('<loc>https://www.xproducoeseeventos.com.br/termos</loc>');
    expect(xml).not.toContain(`${RESERVATION_POLICY_PATH}</loc>`);
  });
});
