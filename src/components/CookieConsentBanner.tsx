import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/Button';
import { useCookieConsent } from '../contexts/CookieConsentContext';
import { GOOGLE_ANALYTICS_TRANSFER_NOTICE } from '../data/cookiePolicy';

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
        {/* D7 (aprovada em 02/11/2026): o aviso diz, em destaque e antes do "Aceitar", que o Google pode tratar os
            dados fora do Brasil (LGPD, art. 33, VIII: consentimento específico e em destaque para a transferência). */}
        <p className="text-sm text-muted-foreground">
          Usamos cookies essenciais para o funcionamento do site e, se você aceitar, cookies de análise do Google
          Analytics para entender como o site é usado.{' '}
          <strong className="font-semibold text-foreground">{GOOGLE_ANALYTICS_TRANSFER_NOTICE}</strong> Você pode
          aceitar ou recusar os cookies de análise e mudar de ideia a qualquer momento na{' '}
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
