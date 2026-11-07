// Páginas que ficam fora do Google Analytics (hooks/useGoogleAnalytics) e do Vercel Analytics (Providers.tsx): a
// página da proposta (P15) e as áreas da equipe (D7).
//
// P15 (aprovada em 02/11/2026): a página da proposta (/proposta, com o código do link depois do "#") e o endereço
// antigo /proposta/<código> não carregam o GA nem mandam page view, mesmo com o aceite de cookies, e o Vercel
// Analytics não recebe a visita. O link é pessoal: a visita não é métrica de marketing, e nada da página (nem o
// endereço) deve sair para terceiros.
// D7 (aprovada em 02/11/2026): "Eu desligo o GA nas áreas /admin e /colaborador e para a equipe". Entram aqui as
// áreas da equipe pelo endereço: o painel (/admin), a área do colaborador (/colaborador, e /collaborator, os
// endereços antigos que levam a ela) e o painel do freelancer (/freelancer). O resto da D7 (GA desligado para a
// equipe também nas páginas públicas, cookies apagados na recusa, conexão com o Google antes do aceite, fontes do
// próprio site, IP e e-mail fora do Sentry) fica para o item da D7.
const ANALYTICS_EXCLUDED_PATHS = [
  /^\/proposta(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/colaborador(\/|$)/,
  /^\/collaborator(\/|$)/,
  /^\/freelancer(\/|$)/,
];

export const isAnalyticsExcludedPath = (pathname: string): boolean =>
  ANALYTICS_EXCLUDED_PATHS.some((pattern) => pattern.test(pathname));

/** O mesmo teste para uma URL inteira (a do evento do Vercel Analytics). URL que não dá para ler não é excluída. */
export const isAnalyticsExcludedUrl = (url: string): boolean => {
  try {
    return isAnalyticsExcludedPath(new URL(url, 'https://www.xproducoeseeventos.com.br').pathname);
  } catch {
    return false;
  }
};
