import { buildPageTitle } from '../data/site';

// D7 (aprovada em 02/11/2026): "troco títulos e ids por textos genéricos nas páginas com dados". Estes endereços levam
// o código da reserva (que tem 5 letras do nome do cliente, ex.: XP-BRUNO-20270110-1200-ABC) ou o nome do mural ou do
// depoimento (que pode ter o nome de alguém, ex.: /upload/casamento-ana). O Google Analytics (hooks/useGoogleAnalytics)
// e o Vercel Analytics (Providers.tsx) recebem só o modelo do endereço (ex.: /cliente/reservas/:id) e, no GA, um título
// genérico. Os endereços do catálogo (/kits, /equipamentos, /servicos, /guias, /portfolio e as páginas por cidade)
// seguem como estão: são públicos e não falam de ninguém. O painel, a área do colaborador e a proposta nem chegam aqui
// (utils/analyticsExclusions); /proposta/<código> entra só por garantia. O React Router casa endereços sem diferenciar
// maiúsculas (/Cliente/Reservas/... abre a mesma página), daí o "i".
const PERSONAL_PAGES: ReadonlyArray<{ pattern: RegExp; path: string; title: string }> = [
  { pattern: /^\/cliente\/reservas\/[^/]/i, path: '/cliente/reservas/:id', title: 'Detalhes da reserva' },
  { pattern: /^\/orcamento-sucesso\/[^/]/i, path: '/orcamento-sucesso/:id', title: 'Pedido de orçamento enviado' },
  { pattern: /^\/reserva-sucesso\/[^/]/i, path: '/reserva-sucesso/:id', title: 'Pedido de orçamento enviado' },
  { pattern: /^\/proposta\/[^/]/i, path: '/proposta/:id', title: 'Proposta' },
  { pattern: /^\/participate\/[^/]/i, path: '/participate/:slug', title: 'Mural do evento' },
  { pattern: /^\/upload\/[^/]/i, path: '/upload/:slug', title: 'Envio de fotos para o mural' },
  { pattern: /^\/depoimentos\/[^/]/i, path: '/depoimentos/:slug', title: 'Depoimento de cliente' },
];

export interface AnalyticsPath {
  /** O caminho que pode sair do site: o modelo do endereço nas páginas com dados; nas outras, o próprio caminho. */
  path: string;
  /** Título genérico das páginas com dados (o GA usaria o da aba); nas outras, nenhum. */
  title?: string;
}

/** O normalizador único do GA e do Vercel Analytics. */
export const toAnalyticsPath = (pathname: string): AnalyticsPath => {
  const page = PERSONAL_PAGES.find(({ pattern }) => pattern.test(pathname));
  return page ? { path: page.path, title: buildPageTitle(page.title) } : { path: pathname };
};

// O telão do mural abre em /tv?slug=<nome do mural> (o nome pode ter o de alguém, como nos endereços do mural acima).
// O GA já fica só com os parâmetros de campanha da query (hooks/useGoogleAnalytics), mas o Vercel Analytics recebe a
// query inteira: no telão ela sai toda.
const TV_PAGE = /^\/tv\/?$/i;

/**
 * O mesmo para a URL inteira do evento do Vercel Analytics: o caminho muda nas páginas com dados e a query sai no
 * telão; no resto, a query e o fragmento ficam como vieram.
 */
export const toAnalyticsUrl = (url: string): string => {
  try {
    const parsed = new URL(url, 'https://www.xproducoeseeventos.com.br');
    const { path } = toAnalyticsPath(parsed.pathname);
    const search = TV_PAGE.test(parsed.pathname) ? '' : parsed.search;
    if (path === parsed.pathname && search === parsed.search) return url;
    return `${url.startsWith('/') ? '' : parsed.origin}${path}${search}${parsed.hash}`;
  } catch {
    return url;
  }
};
