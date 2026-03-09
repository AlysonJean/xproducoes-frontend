
import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

interface AppSettings {
  id: string;
  companyName: string;
  createdAt: string;
  updatedAt: string;
}

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar configurações do backend
  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiFetch<AppSettings>('/settings');
      
      setSettings(data);

      if (data.companyName) {
        localStorage.setItem('companyName', data.companyName);
      }
        } catch (err) {
      // Não mostrar erro ao usuário, apenas usar fallback
      console.info('Using fallback settings (backend unavailable)');

      // Tentar pegar do localStorage (apenas no cliente)
      let savedCompanyName = null;
      if (typeof window !== 'undefined') {
        savedCompanyName = localStorage.getItem('companyName');
      }
      
      const companyName = savedCompanyName || 'X Produções e Eventos';

      setSettings({
        id: 'fallback',
        companyName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  // Salvar configurações no backend
  const saveSettings = async (updates: Partial<Pick<AppSettings, 'companyName'>>) => {
    try {
      setError(null);

      const data = await apiFetch<AppSettings>('/settings', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      // Atualizar estado local
      setSettings(data);
      
      // Sincronizar com localStorage
      if (data.companyName) {
        localStorage.setItem('companyName', data.companyName);
      }
      
      return data;
        } catch (err: unknown) {
      console.warn(`Backend unavailable (${err instanceof Error ? err.message : String(err)}), saving to localStorage only`);
      
      if (updates.companyName !== undefined) {
        localStorage.setItem('companyName', updates.companyName || 'X Produções e Eventos');
      }

      // Atualizar estado local com valores salvos
      setSettings((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          ...updates,
          updatedAt: new Date().toISOString()
        } as AppSettings;
      });
    }
  };


  // Carregar configurações na inicialização
  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    loadSettings,
    saveSettings,
    companyName: settings?.companyName || 'X Produçoes e Eventos'
  };
};