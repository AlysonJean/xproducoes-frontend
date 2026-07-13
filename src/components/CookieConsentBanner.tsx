import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/Button';
import { useCookieConsent } from '../contexts/CookieConsentContext';

const CookieConsentBanner: React.FC = () => {
  const { consent, accept, decline } = useCookieConsent();

  if (consent !== 'unset') return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentimento de cookies"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-card px-4 py-4 shadow-2xl sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Usamos cookies essenciais para o funcionamento do site e, com seu consentimento, cookies de análise
          (Google Analytics) para entender como você usa a plataforma. Você pode aceitar ou recusar os cookies
          de análise a qualquer momento — veja a{' '}
          <Link to="/cookies" className="underline hover:text-foreground">
            Política de Cookies
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <Button variant="outline" size="sm" onClick={decline}>
            Recusar
          </Button>
          <Button variant="primary" size="sm" onClick={accept}>
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
