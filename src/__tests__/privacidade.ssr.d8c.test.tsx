// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { PageContextServer } from 'vike/types';
import { onRenderHtml } from '../../renderer/+onRenderHtml';
import { Page } from '../../pages/all/+Page';
import { COMPANY_REGISTERED_NAME } from '../data/site';

// D7 e D8c (aprovadas em 02/11/2026): a Política de Privacidade e a Política de Cookies novas chegam no HTML que o
// servidor entrega (o que o Google e quem abre o link sem JavaScript leem), com o título e a descrição certos. Mesmo
// arranjo de ssrNotFoundStatus.test.tsx: o app de verdade, pelo onRenderHtml que o api/ssr.js usa na Vercel.
// Textos legais (13/11/2026): versão de 13/11, com o nome empresarial confirmado (Q7) e a seção "Dados de orçamentos e
// contratos".
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

describe('D8c — /privacidade e /cookies no HTML do servidor', () => {
  it('/privacidade: título, descrição, as tabelas, a regra de transferência, o nome empresarial e a seção dos contratos', async () => {
    const page = await ssr('/privacidade');

    expect(page.notFound).toBe(false);
    expect(page.head).toMatch(/<title[^>]*>Política de Privacidade \| X Produções<\/title>/);
    expect(page.head).toMatch(/<meta[^>]* name="description" content="Como a X Produções e Eventos trata seus dados[^"]*Atualizada em 13\/11\/2026\."/);
    expect(page.body).toMatch(/<h1[^>]*>Política de Privacidade<\/h1>/);
    expect(page.body).toContain('Dados tratados, finalidade, base legal e prazo');
    expect(page.body).toContain('Serviços usados pelo site e onde ficam');
    expect(page.body).toContain('LGPD, art. 33, IX');
    expect(page.body).toContain('LGPD, art. 33, VIII');
    expect(page.body).toContain(`(nome empresarial ${COMPANY_REGISTERED_NAME})`);
    expect(page.body).toContain('Dados de orçamentos e contratos');
    expect(page.body.toLowerCase()).not.toContain('personalizar a experiência');
  });

  it('/cookies: os nomes dos cookies e a frase da transferência', async () => {
    const page = await ssr('/cookies');

    expect(page.notFound).toBe(false);
    expect(page.head).toMatch(/<title[^>]*>Política de Cookies \| X Produções<\/title>/);
    for (const name of ['x_access_token', 'x_refresh_token', 'x_session', 'X-CSRF-Token', '_ga']) {
      expect(page.body).toContain(`<code class="break-all">${name}</code>`);
    }
    expect(page.body).toContain('O Google pode tratar os dados do Google Analytics fora do Brasil, inclusive nos Estados Unidos.');
  });
});
