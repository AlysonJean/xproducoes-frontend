import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { useCookieConsent } from '../contexts/CookieConsentContext';

// Achado (revisão antes do deploy): a página ia para o GA com a query string inteira, e os links
// dos e-mails levam credenciais nela (?token= em /redefinir-senha, /verify-email e
// /complete-registration; ?token=&email= em /cadastro-convite; ?code= em /data-deletion-status).
// Só seguem os parâmetros de campanha (utm_*, IDs de clique do Google Ads), que o GA4 lê do
// page_location para atribuir a origem da visita, do jeito que vieram; o resto fica de fora.
const CAMPAIGN_PARAM = /^(?:utm_\w+|gclid|gbraid|wbraid)=/;

const toAnalyticsPage = (pathname: string, search: string): string => {
  const campaign = search
    .replace(/^\?/, '')
    .split('&')
    .filter((pair) => CAMPAIGN_PARAM.test(pair));
  return campaign.length ? `${pathname}?${campaign.join('&')}` : pathname;
};

export const useGoogleAnalytics = () => {
  const location = useLocation();
  const { consent } = useCookieConsent();
  const [initialized, setInitialized] = useState(false);

  // Achado (auditoria): antes, ReactGA.initialize() rodava incondicionalmente para todo
  // visitante — cookies de analytics (_ga/_ga_*) eram gravados sem consentimento algum.
  // ReactGA.initialize() é o único ponto que efetivamente carrega o script do GA e passa a
  // gravar cookies (chamadas a .event()/.send() antes disso são inertes: só empilham num
  // array local, sem o script real carregado — ver node_modules/react-ga4/src/gtag.js).
  // Por isso só este gate é necessário; os outros ~13 call sites de ReactGA.event() no app
  // não precisam de alteração.
  useEffect(() => {
    const gaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;

    if (gaId && consent === 'accepted' && !initialized) {
      // Defer initialization to avoid blocking main thread on initial load
      const timeoutId = setTimeout(() => {
        // Achado (revisão antes do deploy): sem send_page_view: false, o `config` do GA4 manda
        // sozinho um page_view com a URL completa da barra (token incluso) e ainda duplicava o
        // page_view da primeira página, que o efeito abaixo já envia.
        ReactGA.initialize(gaId, { gtagOptions: { send_page_view: false } });
        setInitialized(true);
      }, 3000); // 3 second delay

      return () => clearTimeout(timeoutId);
    }
  }, [consent, initialized]);

  useEffect(() => {
    if (initialized) {
      // Todo hit do GA4 leva por padrão page_location = URL completa da barra, inclusive os
      // ReactGA.event() das páginas (ex.: clique no WhatsApp numa página com token). O `set` troca
      // esse padrão pela URL filtrada para os eventos seguintes; o page_view já vai com ela.
      const page = toAnalyticsPage(location.pathname, location.search);
      const pageLocation = `${window.location.origin}${page}`;
      ReactGA.set({ page_location: pageLocation });
      ReactGA.send({ hitType: "pageview", page, location: pageLocation });
    }
  }, [initialized, location]);
};
