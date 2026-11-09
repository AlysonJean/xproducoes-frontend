import { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { useCookieConsent } from '../contexts/CookieConsentContext';
import { AuthContext } from '../contexts/AuthContext';
import { isAnalyticsExcludedPath } from '../utils/analyticsExclusions';
import { toAnalyticsPath } from '../utils/analyticsPage';
import { setGoogleAnalyticsDisabled } from '../utils/analyticsConsent';

// Achado (revisão antes do deploy): a página ia para o GA com a query string inteira, e os links
// dos e-mails levam credenciais nela (?token= em /redefinir-senha, /verify-email e
// /complete-registration; ?token=&email= em /cadastro-convite; ?code= em /data-deletion-status).
// Só seguem os parâmetros de campanha (utm_*, IDs de clique do Google Ads), que o GA4 lê do
// page_location para atribuir a origem da visita, do jeito que vieram; o resto fica de fora.
const CAMPAIGN_PARAM = /^(?:utm_\w+|gclid|gbraid|wbraid)=/;

// D7 (aprovada em 02/11/2026): o caminho passa pelo normalizador das páginas com dados (utils/analyticsPage), o mesmo
// do Vercel Analytics: o código da reserva e o nome do mural ou do depoimento viram o modelo do endereço.
const toAnalyticsPage = (pathname: string, search: string): { page: string; title?: string } => {
  const { path, title } = toAnalyticsPath(pathname);
  const campaign = search
    .replace(/^\?/, '')
    .split('&')
    .filter((pair) => CAMPAIGN_PARAM.test(pair));
  return { page: campaign.length ? `${path}?${campaign.join('&')}` : path, title };
};

export const useGoogleAnalytics = () => {
  const location = useLocation();
  const { consent } = useCookieConsent();
  // Fora do AuthProvider (só nos testes deste hook) conta como visitante sem login.
  const auth = useContext(AuthContext);
  const [initialized, setInitialized] = useState(false);
  // P15 e D7 (aprovadas em 02/11/2026): na página da proposta e nas áreas da equipe (/admin, /colaborador,
  // /freelancer) o GA não carrega nem manda page view, mesmo com o aceite (utils/analyticsExclusions). Saindo delas
  // pelo site, o GA carrega normalmente.
  const excluded = isAnalyticsExcludedPath(location.pathname);
  // D7: "Eu desligo o GA ... para a equipe". Quem entrou com papel diferente de CLIENT (admin, colaborador,
  // freelancer) não é medido em página nenhuma. Enquanto o site ainda confere a sessão (isLoading), o GA espera para
  // carregar: antes disso não dá para saber se é alguém da equipe. Visitante sem login segue medido depois do aceite.
  const authPending = auth?.isLoading ?? false;
  const role = auth?.user?.role;
  const isTeam = Boolean(role) && role !== 'CLIENT';
  // D7: só com o aceite valendo agora. Antes o page view olhava só se o GA tinha carregado, e quem recusava depois de
  // aceitar seguia medido até recarregar a página.
  const canSend = consent === 'accepted' && !excluded && !isTeam;

  // Achado (auditoria): antes, ReactGA.initialize() rodava incondicionalmente para todo
  // visitante — cookies de analytics (_ga/_ga_*) eram gravados sem consentimento algum.
  // ReactGA.initialize() é o único ponto que efetivamente carrega o script do GA e passa a
  // gravar cookies (chamadas a .event()/.send() antes disso são inertes: só empilham num
  // array local, sem o script real carregado — ver node_modules/react-ga4/src/gtag.js).
  // Por isso só este gate é necessário; os outros ~13 call sites de ReactGA.event() no app
  // não precisam de alteração.
  useEffect(() => {
    const gaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;

    if (gaId && canSend && !authPending && !initialized) {
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
  }, [canSend, authPending, initialized]);

  // D7: com o GA já carregado nesta página, a chave ga-disable do gtag.js segue a mesma regra: fica ligada (nada sai,
  // nem os eventos das páginas, como o clique no WhatsApp ou o "adicionar ao carrinho") nas áreas da equipe, para quem
  // é da equipe e depois da recusa; volta a desligar numa página medida. Vem antes do page view para já valer nele.
  useEffect(() => {
    if (initialized) setGoogleAnalyticsDisabled(!canSend);
  }, [initialized, canSend]);

  useEffect(() => {
    if (initialized && canSend) {
      // Todo hit do GA4 leva por padrão page_location = URL completa da barra, inclusive os
      // ReactGA.event() das páginas (ex.: clique no WhatsApp numa página com token). O `set` troca
      // esse padrão pela URL filtrada para os eventos seguintes; o page_view já vai com ela.
      const { page, title } = toAnalyticsPage(location.pathname, location.search);
      const pageLocation = `${window.location.origin}${page}`;
      ReactGA.set({ page_location: pageLocation });
      // D7: nas páginas com dados o título vai genérico (sem ele, o GA usa o título da aba).
      ReactGA.send({ hitType: "pageview", page, location: pageLocation, ...(title ? { title } : {}) });
    }
  }, [initialized, location, canSend]);
};
