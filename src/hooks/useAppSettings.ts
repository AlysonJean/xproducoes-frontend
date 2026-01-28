import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

interface AppSettings {
  id: string;
  logoUrl: string | null;
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
      // Não mostrar erro ao usuário, apenas usar fallback
      console.info('Using fallback settings (backend unavailable)');

      // Tentar pegar do localStorage (pode ter URL do Cloudinary salva)
      const savedLogoUrl = localStorage.getItem('logoUrl');
      const savedCompanyName = localStorage.getItem('companyName');
      
      // Se houver logo salva no localStorage (pode ser do Cloudinary), usar ela
      // Caso contrário, usar logo local como último recurso
      const logoUrl = savedLogoUrl || '/xproducoes-logo.svg';
      const companyName = savedCompanyName || 'X Produções e Eventos';

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

      const data = await apiFetch<AppSettings>('/settings', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      // Atualizar estado local
      setSettings(data);
      
      // Sincronizar com localStorage
      if (data.logoUrl) {
        localStorage.setItem('logoUrl', data.logoUrl);
      }
      if (data.companyName) {
        localStorage.setItem('companyName', data.companyName);
      }
      
      return data;
    } catch (err: any) {
      console.warn(`Backend unavailable (${err.message}), saving to localStorage only`);
      
      // Salvar localmente como fallback
      if (updates.logoUrl !== undefined) {
        localStorage.setItem('logoUrl', updates.logoUrl || '/xproducoes-logo.svg');
      }
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
    logoUrl: settings?.logoUrl || '/xproducoes-logo.svg',
    companyName: settings?.companyName || 'X Produçoes e Eventos'
  };
};