// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { PageContextServer } from 'vike/types';
import { onRenderHtml } from '../../renderer/+onRenderHtml';
import { Page } from '../../pages/all/+Page';
import { titleFromSlug } from '../utils/slugTitle';

// Onda 2 da auditoria de 19/11, no HTML que o servidor do site entrega (o único que WhatsApp e Facebook leem e o primeiro
// que o Google lê). F3-02/F5-03: canonical, og:url e twitter:url saíam vazios. F5-04: o detalhe de kit, equipamento e
// serviço saía só com "Kits | X Produções". Mesmo arranjo de instagram.ssr.test.tsx.
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

async function head(url: string) {
  const result = (await onRenderHtml({ Page, pageProps: {}, urlOriginal: url, exports: {} } as unknown as PageContextServer)) as { documentHtml: unknown };
  const html = htmlOf(result.documentHtml);
  return html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
}
const attr = (h: string, re: RegExp) => re.exec(h)?.[1];

describe('SSR — canonical e og:url (F3-02/F5-03)', () => {
  it.each([
    ['/', 'https://www.xproducoeseeventos.com.br/'],
    ['/kits?utm_source=instagram', 'https://www.xproducoeseeventos.com.br/kits'],
    ['/equipamentos?categoryId=som', 'https://www.xproducoeseeventos.com.br/equipamentos'],
    ['/aluguel-som-belo-horizonte', 'https://www.xproducoeseeventos.com.br/aluguel-som-belo-horizonte'],
  ])('%s → %s, sem a busca (antes: vazio)', async (url, esperado) => {
    const h = await head(url);
    expect(attr(h, /<link[^>]*rel="canonical"[^>]*href="([^"]*)"/)).toBe(esperado);
    expect(attr(h, /<meta[^>]*property="og:url"[^>]*content="([^"]*)"/)).toBe(esperado);
    expect(attr(h, /<meta[^>]*name="twitter:url"[^>]*content="([^"]*)"/)).toBe(esperado);
  });
});

describe('SSR — detalhe no carregando (F5-04)', () => {
  it.each([
    ['/kits/kit-festa-500', 'Kit Festa 500'],
    ['/equipamentos/caixa-jbl-prx', 'Caixa Jbl Prx'],
    ['/servicos/tecnico-de-som', 'Tecnico De Som'],
  ])('%s sai com o título do endereço e uma descrição', async (url, titulo) => {
    const h = await head(url);
    expect(attr(h, /<title[^>]*>([^<]*)<\/title>/)).toBe(`${titulo} | X Produções`);
    expect(attr(h, /<meta[^>]*name="description"[^>]*content="([^"]*)"/)).toMatch(/Belo Horizonte/);
  });

  it('titleFromSlug: palavras com maiúscula, números como estão; sem slug, vazio', () => {
    expect(titleFromSlug('kit-festa-500')).toBe('Kit Festa 500');
    expect(titleFromSlug('som--ambiente-')).toBe('Som Ambiente');
    expect(titleFromSlug(undefined)).toBe('');
  });
});
