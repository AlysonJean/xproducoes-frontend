// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { PageContextServer } from 'vike/types';
import { onRenderHtml } from '../../renderer/+onRenderHtml';
import { Page } from '../../pages/all/+Page';
import { GUIDES } from '../data/guides';
import { STATIC_ROUTES } from '../utils/sitemapGenerator';
import { TARGET_CITIES, TARGET_SERVICES } from '../utils/localSeoConfig';

// No Vitest, react-router e react-router-dom carregam como duas cópias separadas (em produção são a
// mesma: react-router-dom só reexporta react-router). O StaticRouter do onRenderHtml vem de
// 'react-router' e os hooks do app vêm de 'react-router-dom'; sem unificar, o app não enxerga o roteador.
vi.mock('react-router-dom', async () => await vi.importActual('react-router'));

// No SSR os efeitos não rodam (nenhuma busca acontece); o mock só garante que nada vá à rede.
vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  apiFetch: vi.fn(() => new Promise(() => {})),
}));

// Renderiza o app de verdade (pages/all/+Page.tsx, todas as rotas de src/App.tsx) pelo mesmo
// onRenderHtml do SSR de produção e devolve o que ele informa ao api/ssr.js.
async function notFoundRenderedAt(url: string) {
  const result = await onRenderHtml({ Page, pageProps: {}, urlOriginal: url, exports: {} } as unknown as PageContextServer);
  return (result as { pageContext?: { notFoundRendered?: boolean } }).pageContext?.notFoundRendered;
}

// Achado (auditoria ponta a ponta): endereço errado saía do SSR com status 200 — para o Vike, a rota
// "/*" existe sempre. NotFoundPage agora avisa o onRenderHtml, que devolve
// pageContext.notFoundRendered para api/ssr.js responder 404.
describe('SSR — endereço inexistente é informado para responder 404', () => {
  it('marca os endereços que mostram a página 404', async () => {
    for (const url of ['/pagina-que-nao-existe', '/contatos', '/404', '/guias/guia-que-nao-existe', '/equipamentos/a/b']) {
      expect({ url, notFoundRendered: await notFoundRenderedAt(url) }).toEqual({ url, notFoundRendered: true });
    }
  });

  it('não marca as páginas que existem (landing de SEO local, rotas fixas de um segmento, guia)', async () => {
    for (const url of ['/', '/aluguel-som-belo-horizonte', '/aluguel-palco-estrutura-lagoa-santa', '/sobre', '/ajuda', '/guias', `/guias/${GUIDES[0].slug}`]) {
      expect({ url, notFoundRendered: await notFoundRenderedAt(url) }).toEqual({ url, notFoundRendered: false });
    }
  });

  // Todo endereço publicado no sitemap.xml (rotas fixas + as 20 landings serviço×cidade) continua 200.
  it('nenhum endereço do sitemap mostra a página 404', async () => {
    const urls = [...STATIC_ROUTES, ...TARGET_SERVICES.flatMap((s) => TARGET_CITIES.map((c) => `/${s.slug}-${c.slug}`))];
    const notOk: string[] = [];
    for (const url of urls) {
      if ((await notFoundRenderedAt(url)) !== false) notOk.push(url);
    }
    expect(urls).toHaveLength(STATIC_ROUTES.length + TARGET_SERVICES.length * TARGET_CITIES.length);
    expect(notOk).toEqual([]);
  }, 30_000);

  // O sinal é um objeto por requisição (a Vercel atende requisições simultâneas na mesma instância):
  // uma variável de módulo faria uma página válida sair 404 junto com um endereço errado.
  it('requisições simultâneas não misturam o sinal', async () => {
    const urls = ['/pagina-que-nao-existe', '/sobre', '/contatos', '/aluguel-som-belo-horizonte'];
    const results = await Promise.all(urls.map((url) => notFoundRenderedAt(url)));
    expect(results).toEqual([true, false, true, false]);
  });
});
