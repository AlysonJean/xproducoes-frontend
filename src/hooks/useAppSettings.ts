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

      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        // Se for 404 ou 500, usar fallback local sem mostrar erro
        console.warn(`Backend settings unavailable (${response.status}), using local defaults`);
        throw new Error('Backend unavailable');
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
      // Não mostrar erro ao usuário, apenas usar fallback
      console.info('Using fallback settings (backend unavailable)');

      // Tentar pegar do localStorage (pode ter URL do Cloudinary salva)
      const savedLogoUrl = localStorage.getItem('logoUrl');
      const savedCompanyName = localStorage.getItem('companyName');
      
      // Se houver logo salva no localStorage (pode ser do Cloudinary), usar ela
      // Caso contrário, usar logo local como último recurso
      const logoUrl = savedLogoUrl || '/xproducoes-logo.svg';
      const companyName = savedCompanyName || 'X Produçoes e Eventos';

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
          'Accept': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        // Se backend não disponível, salvar apenas no localStorage
        console.warn(`Backend unavailable (${response.status}), saving to localStorage only`);
        
        if (updates.logoUrl !== undefined) {
          localStorage.setItem('logoUrl', updates.logoUrl || '/xproducoes-logo.svg');
        }
        if (updates.companyName !== undefined) {
          localStorage.setItem('companyName', updates.companyName || 'X Produçoes e Eventos');
        }
        
        // Atualizar estado local
        setSettings(prev => prev ? { ...prev, ...updates } : {
          id: 'fallback',
          logoUrl: updates.logoUrl || '/xproducoes-logo.svg',
          companyName: updates.companyName || 'X Produçoes e Eventos',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        return { success: true, source: 'localStorage' };
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
      console.warn('Failed to save to backend, using localStorage:', err);
      
      // Fallback: salvar no localStorage
      if (updates.logoUrl !== undefined) {
        localStorage.setItem('logoUrl', updates.logoUrl || '/xproducoes-logo.svg');
      }
      if (updates.companyName !== undefined) {
        localStorage.setItem('companyName', updates.companyName || 'X Produçoes e Eventos');
      }
      
      // Atualizar estado local
      setSettings(prev => prev ? { ...prev, ...updates } : {
        id: 'fallback',
        logoUrl: updates.logoUrl || '/xproducoes-logo.svg',
        companyName: updates.companyName || 'X Produçoes e Eventos',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      return { success: true, source: 'localStorage' };
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