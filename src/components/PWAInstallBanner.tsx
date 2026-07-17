import React, { useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import { Button } from './ui/Button';
import { usePWAInstall } from '../hooks/useServiceWorker';
import { useCookieConsent } from '../contexts/CookieConsentContext';

const DISMISS_KEY = 'xp-pwa-install-dismissed-at';
const DISMISS_DAYS = 14;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari não suporta a media query acima antes de instalar
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function wasRecentlyDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
  const daysSinceDismiss = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return daysSinceDismiss < DISMISS_DAYS;
}

const PWAInstallBanner: React.FC = () => {
  const { isInstallable, promptInstall } = usePWAInstall();
  const { consent } = useCookieConsent();
  const [dismissed, setDismissed] = useState(() => isStandalone() || wasRecentlyDismissed());

  // Adia a exibição enquanto o banner de cookies ainda não foi respondido — os dois são
  // banners fixos de rodapé (mesma posição/z-index) e mostrar os dois ao mesmo tempo faz um
  // cobrir o outro por completo.
  if (!isInstallable || dismissed || consent === 'unset') return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  const handleInstall = async () => {
    await promptInstall();
    setDismissed(true);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Instalar aplicativo"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-card px-4 py-4 shadow-2xl sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Instale o app da <strong className="text-foreground">X Produções</strong> para acesso rápido, direto da
            sua tela inicial.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDismiss} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
          <Button variant="primary" size="sm" onClick={handleInstall}>
            Instalar App
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
