
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { secureStorage } from '../utils/secureStorage';
import { logger } from '../utils/logger';
import { sentry } from '../main';

// Helper para garantir URL consistente
const getApiBaseUrl = () => {
  // Se definido no ambiente, usa (removendo slash final se existir)
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }

  // Fallback inteligente para produção (caso a variável de ambiente falhe)
  if (typeof window !== 'undefined' && 
     (window.location.hostname === 'xproducoeseeventos.com.br' || 
      window.location.hostname === 'www.xproducoeseeventos.com.br')) {
    return 'https://api.xproducoeseeventos.com.br/api/v1';
  }

  // Fallback padrão alinhado com api.ts
  return 'http://localhost:4000/api/v1';
};

export interface AuthUser {
  id: string;
  role: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  location?: string;
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
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const navigate = useNavigate();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  // Verificar se o token está expirado
  const isTokenExpired = useCallback(() => {
    if (!tokens) return true;
    return Date.now() >= tokens.expiresAt;
  }, [tokens]);

  // Salvar tokens de forma segura
  const saveTokens = useCallback((newTokens: AuthTokens) => {
    setTokens(newTokens);
    secureStorage.set('accessToken', newTokens.accessToken);
    secureStorage.set('refreshToken', newTokens.refreshToken);
    secureStorage.set('tokenExpiresAt', newTokens.expiresAt.toString());
  }, []);

  // Limpar tokens
  const clearTokens = useCallback(() => {
    setTokens(null);
    secureStorage.remove('accessToken');
    secureStorage.remove('refreshToken');
    secureStorage.remove('tokenExpiresAt');
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  // Backoff para refresh
  const refreshBackoffRef = useRef<number>(1000); // Começa com 1s

  // Agendar refresh automático do token
  const scheduleTokenRefresh = useCallback((): void => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    if (tokens) {
      const timeUntilExpiry = tokens.expiresAt - Date.now();
      const refreshTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 0); // 5 minutos antes

      refreshTimeoutRef.current = setTimeout(() => {
        // Para evitar dependência circular, chama refreshToken via ref
        if (typeof window !== 'undefined' && (window as any).refreshTokenGlobal) {
          (window as any).refreshTokenGlobal();
        }
      }, refreshTime);
    }
  }, [tokens]);

  // Refresh token automático com proteção e backoff
  // Expor refreshToken globalmente para scheduleTokenRefresh
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current || !tokens?.refreshToken) {
      return false;
    }

    isRefreshingRef.current = true;

    try {
      logger.info('Refreshing access token', 'AuthContext');

      const API_BASE_URL = getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Importante: envia cookies automaticamente
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (response.status === 429) {
        // Too Many Requests: aplica backoff exponencial
        logger.warn('Received 429 Too Many Requests on refresh, applying backoff', 'AuthContext');
        refreshBackoffRef.current = Math.min(refreshBackoffRef.current * 2, 60000); // até 60s
        setTimeout(() => {
          isRefreshingRef.current = false;
          refreshToken();
        }, refreshBackoffRef.current);
        return false;
      }

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      // Reset backoff ao sucesso
      refreshBackoffRef.current = 1000;

      const data = await response.json();
      const newTokens: AuthTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || tokens.refreshToken,
        expiresAt: Date.now() + (15 * 60 * 1000), // 15 minutos
      };

      saveTokens(newTokens);
      logger.info('Access token refreshed successfully', 'AuthContext');

      // Agendar próximo refresh
  scheduleTokenRefresh();

      return true;
    } catch (error) {
      logger.error('Failed to refresh token', 'AuthContext', error);
      clearTokens();
      setUser(null);
      return false;
    } finally {
      // Só libera se não estiver em backoff
      if (refreshBackoffRef.current === 1000) {
        isRefreshingRef.current = false;
      }
    }
  }, [tokens, saveTokens, clearTokens, scheduleTokenRefresh]);

  // Expor refreshToken globalmente para evitar dependência circular
  if (typeof window !== 'undefined') {
    (window as any).refreshTokenGlobal = refreshToken;
  }

  // Agendar refresh automático do token

  // Carregar tokens do storage
  const loadTokens = useCallback((): AuthTokens | null => {
    const accessToken = secureStorage.get('accessToken');
    const refreshToken = secureStorage.get('refreshToken');
    const expiresAt = secureStorage.get('tokenExpiresAt');

    if (accessToken && refreshToken && expiresAt) {
      return {
        accessToken,
        refreshToken,
        expiresAt: parseInt(expiresAt),
      };
    }
    return null;
  }, []);

  // Verificar autenticação ao carregar
  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      // Timeout/abort para evitar que a inicialização prenda a aplicação indefinidamente
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8s

      try {
        const savedTokens = loadTokens();

        if (savedTokens && isMounted) {
          // Atualiza o estado local imediatamente para refletir que já temos tokens
          setTokens(savedTokens);

          const API_BASE_URL = getApiBaseUrl();

          // Determinar se o token está expirado usando os savedTokens (evita depender do state que atualiza assincronamente)
          const expired = Date.now() >= savedTokens.expiresAt;

          // Função local para tentar refresh usando um refresh token conhecido
          const tryRefreshWith = async (refreshTok: string | undefined) => {
            if (!refreshTok) return false;
            try {
              const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: refreshTok }),
                signal: controller.signal,
              });

              if (!refreshResponse.ok) return false;
              const data = await refreshResponse.json();

              const newTokens: AuthTokens = {
                accessToken: data.accessToken,
                refreshToken: data.refreshToken || refreshTok,
                expiresAt: Date.now() + (15 * 60 * 1000),
              };

              // Persistir e aplicar novos tokens
              saveTokens(newTokens);
              setTokens(newTokens);

              // Buscar perfil do usuário com o novo token
              const meResp = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${newTokens.accessToken}`, 'Content-Type': 'application/json' },
                signal: controller.signal,
              });
              if (meResp.ok) {
                const userData = await meResp.json();
                setUser(userData);
                // Agendar próximo refresh
                scheduleTokenRefresh();
                return true;
              }
              return false;
            } catch (e) {
              if ((e as any).name === 'AbortError') {
                logger.warn('Auth initialization aborted due to timeout', 'AuthContext');
                return false;
              }
              logger.error('Refresh attempt failed during init', 'AuthContext', e);
              return false;
            }
          };

          if (!expired) {
            // Validar access token diretamente usando savedTokens
            try {
              const resp = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${savedTokens.accessToken}`, 'Content-Type': 'application/json' },
                signal: controller.signal,
              });

              if (resp.ok) {
                const userData = await resp.json();
                setUser(userData);
                // Garantir que agendamos o refresh com base nos tokens carregados
                scheduleTokenRefresh();
              } else if (resp.status === 401) {
                // Access token inválido -> tentar refresh com saved refresh token
                const refreshed = await tryRefreshWith(savedTokens.refreshToken);
                if (!refreshed) {
                  clearTokens();
                  setUser(null);
                }
              } else {
                // Outros códigos -> limpar
                clearTokens();
                setUser(null);
              }
            } catch (e) {
              if ((e as any).name === 'AbortError') {
                logger.warn('Auth validation aborted due to timeout', 'AuthContext');
              } else {
                logger.error('Auth validation failed during init', 'AuthContext', e);
              }
              clearTokens();
              setUser(null);
            }
          } else {
            // Token expirado -> tentar refresh
            const refreshed = await tryRefreshWith(savedTokens.refreshToken);
            if (!refreshed) {
              clearTokens();
              setUser(null);
            }
          }
        }
      } catch (error) {
        logger.error('Auth initialization failed', 'AuthContext', error);
        if (isMounted) {
          clearTokens();
          setUser(null);
        }
      } finally {
        clearTimeout(timeout);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []); // Remover dependências problemáticas

  // Agendar refresh quando tokens mudam
  useEffect(() => {
    if (tokens && !isTokenExpired()) {
      scheduleTokenRefresh();
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [tokens, isTokenExpired, scheduleTokenRefresh]);

  const handleOAuthToken = async (token: string): Promise<string> => {
    setIsLoading(true);
    try {
      // Para OAuth, assumimos que o token é válido e contém user info
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Invalid OAuth token');
      }

      const userData = await response.json();

      // Criar tokens com expiração
      const newTokens: AuthTokens = {
        accessToken: token,
        refreshToken: token, // Para OAuth, refresh token pode ser o mesmo
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hora para OAuth
      };

      saveTokens(newTokens);
      setUser(userData);

      // Agendar refresh
      scheduleTokenRefresh();

      // Retornar rota baseada no role
      switch (userData.role) {
        case 'ADMIN':
          return '/admin/dashboard';
        case 'COLLABORATOR':
          return '/collaborator/dashboard';
        case 'FREELANCER':
          return '/freelancer/dashboard';
        case 'CLIENT':
          return '/client/dashboard';
        default:
          return '/dashboard';
      }

      logger.info('OAuth login successful', 'AuthContext', { userId: userData.id });
    } catch (err) {
      logger.error('OAuth token processing failed', 'AuthContext', err);
      clearTokens();
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithCredentials = async (data: { email: string; password: string }): Promise<string> => {
    setIsLoading(true);
    try {
      const formattedEmail = data.email.toLowerCase().trim();
      logger.info('Attempting credential login', 'AuthContext', { email: formattedEmail });

      // Use the api service instead of raw fetch to ensure consistency
      // This handles base URL, interceptors, etc.
      /* 
         NOTE: We are using direct fetch here to avoid circular dependencies or 
         interceptor issues during login, but we must respect the correct API_BASE_URL.
      */
      
      const baseUrl = getApiBaseUrl();
      
      // Let's log the attempt for debugging
      const loginUrl = `${baseUrl}/auth/login`;
      console.log('Login URL:', loginUrl); 

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, email: formattedEmail }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status} error` };
        }
        throw new Error(errorData.message || 'Login failed');
      }

      const responseData = await response.json();
      const { token, refreshToken, user: userData, redirectTo } = responseData;

      // Criar estrutura de tokens
      const newTokens: AuthTokens = {
        accessToken: token,
        refreshToken: refreshToken || token,
        expiresAt: Date.now() + (15 * 60 * 1000), // 15 minutos
      };

      saveTokens(newTokens);
      setUser(userData);

      // Agendar refresh automático
      scheduleTokenRefresh();

      // Retornar rota de redirecionamento
      if (redirectTo) {
        return redirectTo;
      } else {
        switch (userData.role) {
          case 'ADMIN':
            return '/admin/dashboard';
          case 'COLLABORATOR':
            return '/collaborator/dashboard';
          case 'FREELANCER':
            return '/freelancer/dashboard';
          case 'CLIENT':
            return '/client/dashboard';
          default:
            return '/dashboard';
        }
      }

      logger.info('Credential login successful', 'AuthContext', { userId: userData.id });
    } catch (error) {
      logger.error('Credential login failed', 'AuthContext', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    logger.info('User logout initiated', 'AuthContext', { userId: user?.id });

    // Clear user context in Sentry
    if (sentry?.setUserContext) {
      sentry.setUserContext(null);
    }

    clearTokens();
    setUser(null);
    navigate('/login');
  }, [clearTokens, user, navigate]);

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
