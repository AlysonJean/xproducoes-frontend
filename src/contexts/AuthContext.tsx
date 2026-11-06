// Provider + hook(s) co-localizados de propósito (padrão oficial de Context do React) —
// só afeta a granularidade do Fast Refresh em dev, sem efeito em produção/correção.
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { logger } from '../utils/logger';
import { getApiBaseUrl } from '../utils/apiConfig';
import { authService } from '../services/authservice';
import { authAPI } from '../services/api';
import { shouldTrySessionRestore } from '../utils/sessionHint';

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
  logout: () => Promise<void>;
  loginWithCredentials?: (data: { email: string; password: string }) => Promise<string>;
  handleOAuthToken?: (token: string) => Promise<string>;
  refreshToken: () => Promise<boolean>;
  isTokenExpired: () => boolean;
  /**
   * Atualiza o usuário autenticado sem chamar /auth/login — para fluxos onde o backend
   * já autenticou (setou os cookies httpOnly) como efeito colateral de outra ação, ex.:
   * checkout de convidado em /bookings/guest, que cria a conta e loga de uma vez.
   */
  setAuthenticatedUser: (user: AuthUser) => void;
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

  // ✅ NEW: Token validation via cookie (not localStorage)
  // Cookies are httpOnly and managed by browser - NO JS access needed
  const isTokenExpired = useCallback(() => {
    // Note: We cannot check cookie expiry from JS (httpOnly cookies)
    // Instead, we'll let the backend validate via API response
    // If 401 received, token is expired and interceptor will refresh
    return false; // Browser handles cookie lifecycle
  }, []);

  // Refresh token using centralized service
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const newToken = await authService.refreshToken();
    return !!newToken;
  }, []);

  // Achado: o logout só limpava o estado e recarregava em /login — os cookies de sessão são
  // httpOnly (só o servidor apaga) e continuavam válidos, então a página recarregada logava a
  // pessoa de novo. Primeiro o backend encerra a sessão (apaga os cookies e invalida o refresh
  // token); se a chamada falhar, sai localmente mesmo assim.
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      logger.warn('Falha ao encerrar a sessão no servidor', 'AuthContext', error);
    }
    setUser(null);
    authService.logout();
  }, []);

  // Escutar eventos globais de autenticação
  useEffect(() => {
    const handleRefreshed = () => {
      logger.info('AuthContext: Token refreshed event received', 'AuthContext');
      // Nada a atualizar aqui: o novo access token já chegou como cookie httpOnly.
    };

    const handleLogout = () => {
      setUser(null);
    };

        window.addEventListener('auth:refreshed', handleRefreshed);
    window.addEventListener('auth:logout', handleLogout);

    return () => {
            window.removeEventListener('auth:refreshed', handleRefreshed);
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  // ✅ REFACTORED: Check auth via API call (not localStorage)
  // Cookies are sent automatically via axios (withCredentials: true)
  // If user has valid httpOnly cookie, API returns profile
  // If not, API returns 401 and user is logged out
  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      // Sem sinal de sessão (cookie x_session) e já tentado nesta aba: não há o que restaurar.
      if (!shouldTrySessionRestore()) {
        if (isMounted) setIsLoading(false);
        return;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        // ✅ NEW: No token checks - just try to fetch profile
        // If cookie is valid, backend will recognize it
        // If not, we'll get 401 and stay logged out
        try {
          const profileResp = await authAPI.getProfile();
          const userData = profileResp.data;
          if (isMounted && userData) {
            setUser(userData);
          }
        } catch (profileError: unknown) {
          // 401 means no valid cookie - user is not authenticated
          if (axios.isAxiosError(profileError) && profileError.response?.status === 401) {
            if (isMounted) {
              setUser(null);
            }
          } else {
            logger.warn('Profile fetch failed during init', 'AuthContext', profileError);
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

  const handleOAuthToken = useCallback(async (token: string): Promise<string> => {
    setIsLoading(true);
    try {
      const API_BASE_URL = getApiBaseUrl();
      // ✅ Backend handles cookie setup automatically
      // Just send token for validation, backend returns user data
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies in request
      });

      if (!response.ok) throw new Error('Invalid OAuth token');
      const rawData = await response.json();
      const userData = rawData.data || rawData;

      // Tokens já chegaram como cookies httpOnly (Set-Cookie na resposta).
      setUser(userData);

      switch (userData.role) {
        case 'ADMIN': return '/admin/painel';
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
  }, []);

  const loginWithCredentials = useCallback(async (data: { email: string; password: string }): Promise<string> => {
    setIsLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: include=send+receive cookies
        body: JSON.stringify({ ...data, email: data.email.toLowerCase().trim() }),
      });

      if (!response.ok) {
        // N1 (02/11/2026): o servidor manda o motivo em `error` e o código em `code` (globalErrorHandler);
        // aqui só se lia `message`, e toda recusa virava "Login failed". O código vai junto no erro para a
        // tela oferecer "Reenviar confirmação" quando for EMAIL_NOT_VERIFIED.
        const errorData = await response.json().catch(() => ({})) as { error?: string; message?: string; code?: string };
        const loginError = new Error(errorData.error || errorData.message || 'Não foi possível entrar. Tente de novo.') as Error & { code?: string };
        if (typeof errorData.code === 'string') loginError.code = errorData.code;
        throw loginError;
      }

      const { user: userData, redirectTo } = await response.json();

      // Tokens já foram gravados como cookies httpOnly pelo backend.
      setUser(userData);

      if (redirectTo) return redirectTo;
      switch (userData.role) {
        case 'ADMIN': return '/admin/painel';
        case 'COLLABORATOR': return '/collaborator/dashboard';
        case 'CLIENT': return '/client/dashboard';
        default: return '/dashboard';
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setAuthenticatedUser = useCallback((userData: AuthUser) => {
    setUser(userData);
  }, []);

  const value: AuthContextType = useMemo(() => ({
    isAuthenticated: !!user,
    isLoading,
    user,
    logout,
    loginWithCredentials,
    handleOAuthToken,
    refreshToken,
    isTokenExpired,
    setAuthenticatedUser,
  }), [user, isLoading, logout, loginWithCredentials, handleOAuthToken, refreshToken, isTokenExpired, setAuthenticatedUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
