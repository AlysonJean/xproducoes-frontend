import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { useCookieConsent } from '../contexts/CookieConsentContext';

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
        ReactGA.initialize(gaId);
        setInitialized(true);
      }, 3000); // 3 second delay

      return () => clearTimeout(timeoutId);
    }
  }, [consent, initialized]);

  useEffect(() => {
    if (initialized) {
      // Send pageview with path
      ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
    }
  }, [initialized, location]);
};
