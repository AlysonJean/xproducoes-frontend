// src/contexts/SettingsContext.tsx

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAppSettings } from '../hooks/useAppSettings';

interface SettingsContextType {
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
  companyName: string;
  setCompanyName: (name: string) => void;
  loading: boolean;
  error: string | null;
  saveSettings: (updates: { logoUrl?: string | null; companyName?: string }) => Promise<any>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const {
    logoUrl,
    companyName,
    loading,
    error,
    saveSettings: saveAppSettings
  } = useAppSettings();

  const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(logoUrl);
  const [localCompanyName, setLocalCompanyName] = useState<string>(companyName);

  // Sincronizar com as configurações carregadas
  useEffect(() => {
    if (logoUrl !== undefined) {
      setLocalLogoUrl(logoUrl);
    }
    if (companyName) {
      setLocalCompanyName(companyName);
    }
  }, [logoUrl, companyName]);

  const setLogoUrl = async (url: string | null) => {
    setLocalLogoUrl(url);
    try {
      await saveAppSettings({ logoUrl: url });
    } catch (err) {
      console.error('Erro ao salvar logo:', err);
      // Reverter em caso de erro
      setLocalLogoUrl(logoUrl);
    }
  };

  const setCompanyName = async (name: string) => {
    setLocalCompanyName(name);
    try {
      await saveAppSettings({ companyName: name });
    } catch (err) {
      console.error('Erro ao salvar nome da empresa:', err);
      // Reverter em caso de erro
      setLocalCompanyName(companyName);
    }
  };

  const saveSettings = async (updates: { logoUrl?: string | null; companyName?: string }) => {
    return await saveAppSettings(updates);
  };

  return (
    <SettingsContext.Provider value={{
      logoUrl: localLogoUrl,
      setLogoUrl,
      companyName: localCompanyName,
      setCompanyName,
      loading,
      error,
      saveSettings
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings deve ser usado dentro de um SettingsProvider');
  }
  return context;
};
