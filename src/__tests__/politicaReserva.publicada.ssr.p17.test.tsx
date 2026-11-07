// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { PageContextServer } from 'vike/types';
import { onRenderHtml } from '../../renderer/+onRenderHtml';
import { Page } from '../../pages/all/+Page';
import { generateSitemap } from '../utils/sitemapGenerator';
import {
  RESERVATION_POLICY_DRAFT_NOTICE,
  RESERVATION_POLICY_PATH,
  RESERVATION_POLICY_PUBLISHED,
} from '../data/reservationPolicy';

// P17 (aprovada em 02/11/2026): uma chave só publica a política. Aqui ela vale true (como no dia em que o dono e o
// advogado aprovarem o texto): o aviso de rascunho e o noindex saem, o rodapé ganha o link ao lado dos Termos e o
// sitemap passa a listar a página. Mesmo arranjo de ssrNotFoundStatus.test.tsx (onRenderHtml, o caminho do api/ssr.js).
vi.mock('../data/reservationPolicy', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../data/reservationPolicy')>()),
  RESERVATION_POLICY_PUBLISHED: true,
}));
vi.mock('react-router-dom', async () => await vi.importActual('react-router'));
vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  apiFetch: vi.fn(() => new Promise(() => {})),
}));

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

describe('P17 — política de reserva publicada (chave ligada)', () => {
  it('a chave vale true neste arquivo', () => {
    expect(RESERVATION_POLICY_PUBLISHED).toBe(true);
  });

  it('a página abre sem o aviso de rascunho e sem noindex', async () => {
    const page = await ssr(RESERVATION_POLICY_PATH);

    expect(page.notFound).toBe(false);
    expect(page.body).toMatch(/<h1[^>]*>Política de reserva e cancelamento<\/h1>/);
    expect(page.body).not.toContain(RESERVATION_POLICY_DRAFT_NOTICE);
    expect(page.head).not.toContain('name="robots"');
  });

  it('o rodapé liga para a política, logo depois dos Termos de Uso', async () => {
    const { body } = await ssr('/');
    const footer = body.slice(body.indexOf('<footer'), body.indexOf('</footer>'));

    expect(footer).toMatch(/<a[^>]*href="\/politica-de-reserva"[^>]*>Reserva e Cancelamento<\/a>/);
    const terms = footer.indexOf('href="/termos"');
    const policy = footer.indexOf(`href="${RESERVATION_POLICY_PATH}"`);
    const privacy = footer.indexOf('href="/privacidade"');
    expect(terms).toBeGreaterThan(-1);
    expect(policy).toBeGreaterThan(terms);
    expect(privacy).toBeGreaterThan(policy);
  });

  it('o sitemap lista a página', async () => {
    const xml = await generateSitemap();
    expect(xml).toContain('<loc>https://www.xproducoeseeventos.com.br/politica-de-reserva</loc>');
  });
});
