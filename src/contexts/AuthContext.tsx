/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { secureStorage } from '../utils/secureStorage';
import { logger } from '../utils/logger';
import { getApiBaseUrl } from '../utils/apiConfig';
import { authService } from '../services/authservice';
import { authAPI } from '../services/api';

// Lazy sentry getter to avoid circular dependency with main.tsx


export interface AuthUser {
  id: string;
  role: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  googleCalendarEmail?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  logout: () => void;
  loginWithCredentials?: (data: { email: string; password: string }) => Promise<string>;
  handleOAuthToken?: (token: string) => Promise<string>;
  refreshToken: () => Promise<boolean>;
  isTokenExpired: () => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar se o token está expirado
  const isTokenExpired = useCallback(() => {
    const expiresAt = secureStorage.get('tokenExpiresAt');
    if (!expiresAt) return true;
    return Date.now() >= parseInt(expiresAt);
  }, []);

  // Refresh token usando o serviço centralizado
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const newToken = await authService.refreshToken();
    return !!newToken;
  }, []);

  // Logout usando o serviço centralizado
  // Logout usando o serviço centralizado
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  // Escutar eventos globais de autenticação
  useEffect(() => {
    const handleRefreshed = () => {
      logger.info('AuthContext: Token refreshed event received', 'AuthContext');
      // No need to update local state here as accessToken is in secureStorage
    };

    const handleLogout = () => {
      setUser(null);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.addEventListener('auth:refreshed' as any, handleRefreshed);
    window.addEventListener('auth:logout', handleLogout);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.removeEventListener('auth:refreshed' as any, handleRefreshed);
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  // Verificar autenticação ao carregar
  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const accessToken = secureStorage.get('accessToken');
        const refreshTokenVal = secureStorage.get('refreshToken');
        const expiresAt = secureStorage.get('tokenExpiresAt');

        if (accessToken && refreshTokenVal && expiresAt && isMounted) {
          const expired = Date.now() >= parseInt(expiresAt);

          if (expired) {
            const refreshed = await authService.refreshToken();
            if (!refreshed) {
              setIsLoading(false);
              return;
            }
            // Token refreshed successfully
          }

          // Buscar perfil usando a instância api para aproveitar o interceptor de refresh automático
          try {
            const profileResp = await authAPI.getProfile();
            // A instância 'api' de axios retorna a resposta original. O dado está em .data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const userData = (profileResp as any).data || profileResp;
            setUser(userData);
          } catch (profileError) {
            logger.error('Failed to fetch user profile during initialization', 'AuthContext', profileError);
            // Se falhou mesmo após o refresh do interceptor, o usuário não está autenticado
            setUser(null);
          }
        }
      } catch (error) {
        logger.error('Auth initialization failed', 'AuthContext', error);
      } finally {
        clearTimeout(timeout);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();
    return () => { isMounted = false; };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleOAuthToken = async (token: string): Promise<string> => {
    setIsLoading(true);
    try {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Invalid OAuth token');
      const userData = await response.json();

      secureStorage.set('accessToken', token);
      secureStorage.set('refreshToken', token);
      secureStorage.set('tokenExpiresAt', (Date.now() + (60 * 60 * 1000)).toString());
      
      setUser(userData);
      
      switch (userData.role) {
        case 'ADMIN': return '/admin/dashboard';
        case 'COLLABORATOR': return '/collaborator/dashboard';
        case 'CLIENT': return '/client/dashboard';
        default: return '/dashboard';
      }
    } catch (err) {
      authService.logout();
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loginWithCredentials = async (data: { email: string; password: string }): Promise<string> => {
    setIsLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, email: data.email.toLowerCase().trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(errorData.message || 'Login failed');
      }

      const { token, refreshToken: rToken, user: userData, redirectTo } = await response.json();

      secureStorage.set('accessToken', token);
      secureStorage.set('refreshToken', rToken || token);
      secureStorage.set('tokenExpiresAt', (Date.now() + (15 * 60 * 1000)).toString());
      
      setUser(userData);

      if (redirectTo) return redirectTo;
      switch (userData.role) {
        case 'ADMIN': return '/admin/dashboard';
        case 'COLLABORATOR': return '/collaborator/dashboard';
        case 'CLIENT': return '/client/dashboard';
        default: return '/dashboard';
      }
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = useMemo(() => ({
    isAuthenticated: !!user,
    isLoading,
    user,
    logout,
    loginWithCredentials,
    handleOAuthToken,
    refreshToken,
    isTokenExpired,
  }), [user, isLoading, logout, loginWithCredentials, handleOAuthToken, refreshToken, isTokenExpired]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
