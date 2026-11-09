import ReactGA from 'react-ga4';

// D7 (aprovada em 02/11/2026): "faço a recusa depois do aceite apagar os cookies e recarregar". Antes, recusar depois
// de aceitar (no banner, em "Gerenciar preferências" na página /cookies ou em outra aba) só trocava a escolha guardada:
// o GA já carregado seguia medindo a pessoa até ela recarregar a página, e os cookies _ga ficavam no navegador.

// Os dois cookies que o GA4 grava: _ga (o visitante) e _ga_<id da propriedade> (a sessão).
const GA_COOKIE = /^_ga(?:_|$)/;

/**
 * Liga (true) ou desliga (false) o envio do GA nesta página: o gtag.js confere a chave window['ga-disable-<id>'] a
 * cada envio, inclusive nos eventos das páginas (ReactGA.event), e não manda nada enquanto ela for true.
 */
export const setGoogleAnalyticsDisabled = (disabled: boolean): void => {
  const gaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
  if (!gaId || typeof window === 'undefined') return;
  (window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] = disabled;
};

// O GA4 grava o cookie no domínio mais alto que o navegador aceita (cookie_domain "auto"): em
// .xproducoeseeventos.com.br, não em www. Por isso o cookie é apagado no próprio endereço e em cada domínio acima dele;
// o navegador ignora a tentativa num sufixo público como com.br.
const parentDomains = (hostname: string): string[] => {
  const labels = hostname.split('.');
  return labels.slice(0, -1).map((_, i) => labels.slice(i).join('.'));
};

/** Apaga _ga e _ga_* do endereço atual e do domínio do site. Os outros cookies (sessão, CSRF) ficam. */
export const deleteGoogleAnalyticsCookies = (): void => {
  if (typeof document === 'undefined') return;
  const names = new Set(
    document.cookie
      .split(';')
      .map((pair) => pair.split('=')[0].trim())
      .filter((name) => GA_COOKIE.test(name)),
  );
  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    for (const domain of parentDomains(window.location.hostname)) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
    }
  }
};

/**
 * Chamado quando o consentimento deixa de ser "aceito" (contexts/CookieConsentContext): o GA para de enviar nesta
 * página, recebe a recusa (analytics_storage negado) se já tinha carregado, e os cookies dele saem. Devolve true quando
 * o GA tinha carregado: aí a página precisa recarregar uma vez para tirar o script da memória.
 */
export const revokeAnalytics = (): boolean => {
  if (typeof window === 'undefined') return false;
  setGoogleAnalyticsDisabled(true);
  const gaLoaded = ReactGA.isInitialized === true;
  if (gaLoaded) ReactGA.gtag('consent', 'update', { analytics_storage: 'denied' });
  deleteGoogleAnalyticsCookies();
  return gaLoaded;
};
