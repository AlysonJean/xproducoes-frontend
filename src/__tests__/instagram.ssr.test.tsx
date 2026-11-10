// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { PageContextServer } from 'vike/types';
import { onRenderHtml } from '../../renderer/+onRenderHtml';
import { Page } from '../../pages/all/+Page';

// Pedido do dono de 09/11/2026 (Instagram): a seção do Instagram está na página inicial e no Portfólio, que saem do
// servidor do site (api/ssr.js na Vercel). Mesmo arranjo de ssrNotFoundStatus.test.tsx: o app de verdade pelo
// onRenderHtml de produção, em ambiente Node (sem window). No servidor a busca não acontece: sai só o esqueleto de
// carregamento, sem nenhum player nem endereço do Instagram, e a trilha do projeto nunca mostra o texto do endereço.
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

function breadcrumbNames(head: string): string[] | null {
  for (const match of head.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    const data = JSON.parse(match[1]);
    if (data['@type'] === 'BreadcrumbList') return data.itemListElement.map((item: { name: string }) => item.name);
  }
  return null;
}

const noInstagramRequest = (body: string) => {
  expect(body).not.toContain('<iframe');
  expect(body).not.toMatch(/instagram\.com\/(p|reel|tv)\//);
  expect(body).not.toContain('/embed/');
};

describe('Instagram no HTML do servidor', () => {
  it('/: o bloco sai como esqueleto de carregamento, sem player e sem endereço do Instagram', async () => {
    const page = await ssr('/');
    expect(page.notFound).toBe(false);
    expect(page.body).toContain('Do nosso Instagram');
    expect(page.body).toContain('Carregando as publicações do Instagram…');
    expect(page.body).toContain('aria-busy="true"');
    noInstagramRequest(page.body);
  }, 30_000);

  it('/portfolio: página carregando, trilha "Portfólio" e nada do Instagram', async () => {
    const page = await ssr('/portfolio');
    expect(page.notFound).toBe(false);
    expect(page.body).toContain('Carregando portfólio...');
    noInstagramRequest(page.body);
    expect(breadcrumbNames(page.head)).toEqual(['Início', 'Portfólio']);
  }, 30_000);

  it('/portfolio/camarote-no-estadio-mineirao: a trilha do servidor não mostra o texto do endereço', async () => {
    const page = await ssr('/portfolio/camarote-no-estadio-mineirao');
    expect(page.notFound).toBe(false);
    const nav = page.body.slice(page.body.indexOf('aria-label="Trilha de navegação"'));
    const trail = nav.slice(0, nav.indexOf('</nav>'));
    expect(trail).toContain('Portfólio');
    expect(trail.toLowerCase()).not.toContain('camarote');
    expect(page.body).not.toContain('Camarote no estadio mineirao');
    expect(breadcrumbNames(page.head)).toEqual(['Início', 'Portfólio']);
    noInstagramRequest(page.body);
  }, 30_000);
});
