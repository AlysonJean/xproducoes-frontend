// Onda 2 da auditoria de 19/11 (F5-05): abrir e fechar um projeto do portfólio troca /portfolio por /portfolio/:slug (o
// modal sobre a lista); essa troca não rola a página ao topo. Qualquer outra troca de caminho rola.
const PORTFOLIO_PATH = /^\/portfolio(\/|$)/;

export function keepsScrollPosition(from: string, to: string): boolean {
  return from !== to && PORTFOLIO_PATH.test(from) && PORTFOLIO_PATH.test(to);
}
