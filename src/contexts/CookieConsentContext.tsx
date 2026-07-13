// Provider + hook(s) co-localizados de propósito (padrão oficial de Context do React) —
// só afeta a granularidade do Fast Refresh em dev, sem efeito em produção/correção.
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';

// Achado (auditoria): o site inicializa Google Analytics (useGoogleAnalytics.ts) para todo
// visitante, sem nenhum consentimento prévio — CookiesPage.tsx só dizia "gerencie via seu
// navegador", sem oferecer um mecanismo real de aceite/recusa. Este Context é a fonte única
// de verdade sobre o consentimento, lida por useGoogleAnalytics (só chama
// ReactGA.initialize() quando consent === 'accepted') e pelo banner (CookieConsentBanner).
export type CookieConsent = 'unset' | 'accepted' | 'declined';

const STORAGE_KEY = 'xproducoes_cookie_consent';

interface CookieConsentContextType {
  consent: CookieConsent;
  accept: () => void;
  decline: () => void;
  reset: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

export const useCookieConsent = () => {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
};

export const CookieConsentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // SSR-safe: mesmo padrão de inicializador preguiçoso do ThemeContext, para não fazer
  // setState síncrono no corpo do render (causa raiz documentada do React #419 em produção,
  // ver ThemeContext.tsx) nem divergir do HTML gerado no servidor (que não tem localStorage).
  const [consent, setConsent] = useState<CookieConsent>(() => {
    if (typeof window === 'undefined') return 'unset';
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'accepted' || saved === 'declined') return saved;
    return 'unset';
  });

  useEffect(() => {
    if (consent === 'unset') return;
    window.localStorage.setItem(STORAGE_KEY, consent);
  }, [consent]);

  // Sincroniza entre abas (mesmo padrão do ThemeContext)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'accepted' || e.newValue === 'declined' || e.newValue === null)) {
        setConsent(e.newValue ?? 'unset');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const accept = useCallback(() => setConsent('accepted'), []);
  const decline = useCallback(() => setConsent('declined'), []);
  const reset = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setConsent('unset');
  }, []);

  const value = useMemo(() => ({ consent, accept, decline, reset }), [consent, accept, decline, reset]);

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
};
