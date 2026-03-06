/* eslint-disable react-refresh/only-export-components */
// src/contexts/SettingsContext.tsx

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAppSettings } from '../hooks/useAppSettings';

interface SettingsContextType {
  companyName: string;
  setCompanyName: (name: string) => void;
  loading: boolean;
  error: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saveSettings: (updates: { companyName?: string }) => Promise<any>;
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

  // Sincronizar com as configurações carregadas
  useEffect(() => {
    if (companyName) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalCompanyName(companyName);
    }
  }, [companyName]);

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
