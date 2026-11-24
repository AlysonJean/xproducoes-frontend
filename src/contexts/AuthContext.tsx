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

// Onda 4 da auditoria de 19/11 (F1-13): prazo de cada tentativa de abrir a sessão e a espera antes da segunda.
export const PROFILE_TIMEOUT_MS = 8000;
export const PROFILE_RETRY_DELAY_MS = 1500;

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
  // D9: a Google Agenda estava conectada e o Google recusou a permissão (revogada ou vencida).
  googleCalendarNeedsReconnect?: boolean;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  logout: () => Promise<void>;
  loginWithCredentials?: (data: { email: string; password: string }) => Promise<string>;
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
      try {
        // ✅ NEW: No token checks - just try to fetch profile
        // If cookie is valid, backend will recognize it
        // If not, we'll get 401 and stay logged out
        try {
          // Onda 4 da auditoria de 19/11 (F1-13): até 8 s por tentativa e, numa falha que não é 401 (502 do proxy, rede), uma
          // segunda tentativa 1,5 s depois. Antes, a primeira falha deixava a pessoa deslogada e a rota protegida a
          // mandava para /login. Só repete quando falha, então não acorda o banco à toa.
          const fetchProfile = () => authAPI.getProfile({ timeout: PROFILE_TIMEOUT_MS });
          const profileResp = await fetchProfile().catch(async (firstError: unknown) => {
            if ((firstError as { response?: { status?: number } } | null)?.response?.status === 401) throw firstError;
            await new Promise((resolve) => setTimeout(resolve, PROFILE_RETRY_DELAY_MS));
            return fetchProfile();
          });
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
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();
    return () => { isMounted = false; };
  }, []);

  // Onda 2 da auditoria de 19/11 (F1-03): o login não liga mais o isLoading global. O AuthRedirect troca a página
  // pelo carregando enquanto isLoading; a LoginPage era desmontada no meio do envio, e o erro, o e-mail digitado e o
  // "Reenviar confirmação" se perdiam. A LoginPage já mostra o próprio "Entrando...".
  const loginWithCredentials = useCallback(async (data: { email: string; password: string }): Promise<string> => {
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
    setAuthenticatedUser,
  }), [user, isLoading, logout, loginWithCredentials, setAuthenticatedUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
