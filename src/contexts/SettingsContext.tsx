// src/contexts/SettingsContext.tsx

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface SettingsContextType {
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
  companyName: string;
  setCompanyName: (name: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Um URL de logo padrão para que a aplicação não comece sem um
const DEFAULT_LOGO_URL = null; // Removido para evitar erro de CORS
const DEFAULT_COMPANY_NAME = 'X Produções';

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [logoUrl, setLogoUrlState] = useState<string | null>(() => {
    const stored = localStorage.getItem('logoUrl');
    // Se a URL armazenada for a antiga do tailwindui, ignorar
    if (stored && stored.includes('tailwindui.com')) {
      localStorage.removeItem('logoUrl');
      return DEFAULT_LOGO_URL;
    }
    return stored || DEFAULT_LOGO_URL;
  });
  const [companyName, setCompanyNameState] = useState<string>(() => {
    return localStorage.getItem('companyName') || DEFAULT_COMPANY_NAME;
  });

  useEffect(() => {
    if (logoUrl) {
      localStorage.setItem('logoUrl', logoUrl);
    } else {
      localStorage.removeItem('logoUrl');
    }
  }, [logoUrl]);

  useEffect(() => {
    if (companyName) {
      localStorage.setItem('companyName', companyName);
    } else {
      localStorage.removeItem('companyName');
    }
  }, [companyName]);

  const setLogoUrl = (url: string | null) => {
    setLogoUrlState(url);
  };
  const setCompanyName = (name: string) => {
    setCompanyNameState(name);
  };

  return (
    <SettingsContext.Provider value={{ logoUrl, setLogoUrl, companyName, setCompanyName }}>{children}</SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings deve ser usado dentro de um SettingsProvider');
  }
  return context;
};
