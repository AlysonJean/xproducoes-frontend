import { useState, useEffect } from 'react';

interface AppSettings {
  id: string;
  logoUrl: string | null;
  companyName: string;
  createdAt: string;
  updatedAt: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar configurações do backend
  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/settings`);
      if (!response.ok) {
        throw new Error('Erro ao carregar configurações');
      }

      const data = await response.json();
      
      // Se não houver logo no backend, usar a logo local
      if (!data.logoUrl) {
        data.logoUrl = '/xproducoes-logo.svg';
      }
      
      setSettings(data);

      // Sincronizar com localStorage para compatibilidade
      if (data.logoUrl) {
        localStorage.setItem('logoUrl', data.logoUrl);
      }
      if (data.companyName) {
        localStorage.setItem('companyName', data.companyName);
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');

      // Fallback para localStorage se o backend falhar
      const logoUrl = localStorage.getItem('logoUrl') || '/xproducoes-logo.svg';
      const companyName = localStorage.getItem('companyName') || 'X Produçoes e Eventos';

      setSettings({
        id: 'fallback',
        logoUrl,
        companyName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  // Salvar configurações no backend
  const saveSettings = async (updates: Partial<Pick<AppSettings, 'logoUrl' | 'companyName'>>) => {
    try {
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar configurações');
      }

      const updatedSettings = await response.json();
      setSettings(updatedSettings);

      // Sincronizar com localStorage
      if (updatedSettings.logoUrl) {
        localStorage.setItem('logoUrl', updatedSettings.logoUrl);
      }
      if (updatedSettings.companyName) {
        localStorage.setItem('companyName', updatedSettings.companyName);
      }

      return updatedSettings;
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
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
    logoUrl: settings?.logoUrl || '/xproducoes-logo.svg',
    companyName: settings?.companyName || 'X Produçoes e Eventos'
  };
};