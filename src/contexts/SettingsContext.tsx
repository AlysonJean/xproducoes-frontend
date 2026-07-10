// Provider + hook(s) co-localizados de propósito (padrão oficial de Context do React) —
// só afeta a granularidade do Fast Refresh em dev, sem efeito em produção/correção.
/* eslint-disable react-refresh/only-export-components */
// src/contexts/SettingsContext.tsx

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
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
  // Sincroniza com companyName (fonte externa, de useAppSettings) sempre que ela mudar.
  //
  // Achado (produção): isto já ajustou o estado durante a renderização (fora de useEffect)
  // para evitar um re-render extra — mas SettingsProvider fica no topo da árvore
  // (AllContextsProvider), envolvendo rotas com lazy()/Suspense. Um setState síncrono no
  // corpo do render de um Provider tão alto pode interromper a hidratação de Suspense
  // boundaries descendentes ("Uncaught Error: Minified React error #419" — confirmado como
  // causa raiz do mesmo problema em ThemeContext.tsx). useEffect roda depois do
  // commit/hidratação, por isso é a escolha certa aqui.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (companyName) setLocalCompanyName(companyName);
  }, [companyName]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
