/* eslint-disable react-refresh/only-export-components */
// src/contexts/SettingsContext.tsx

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useAppSettings, type AppSettings } from '../hooks/useAppSettings';

interface SettingsContextType {
  companyName: string;
  setCompanyName: (name: string) => void;
  loading: boolean;
  error: string | null;
    saveSettings: (updates: { companyName?: string }) => Promise<AppSettings | undefined>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const {
    companyName,
    loading,
    error,
    saveSettings: saveAppSettings
  } = useAppSettings();

  const [localCompanyName, setLocalCompanyName] = useState<string>(companyName);
  // Rastreia o último `companyName` (fonte externa, de useAppSettings) já sincronizado, para
  // ajustar o estado local durante a renderização em vez de um useEffect (evita setState
  // síncrono no corpo do efeito — react-hooks/set-state-in-effect — e também evita um
  // re-render extra: https://react.dev/learn/you-might-not-need-an-effect).
  const [syncedCompanyName, setSyncedCompanyName] = useState<string>(companyName);
  if (companyName && companyName !== syncedCompanyName) {
    setSyncedCompanyName(companyName);
    setLocalCompanyName(companyName);
  }

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

  const saveSettings = async (updates: { companyName?: string }) => {
    return await saveAppSettings(updates);
  };

  return (
    <SettingsContext.Provider value={{
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
