
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { secureStorage } from '../utils/secureStorage';

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

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  logout: () => void;
  loginWithCredentials?: (data: { email: string; password: string }) => Promise<void>;
  handleOAuthToken?: (token: string) => Promise<void>;
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
  const navigate = useNavigate();

  // Verificar se há token salvo ao carregar a aplicação
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        // Verificar se o token é válido
        const isValid = await validateToken(token, isMounted);
        if (!isValid && isMounted) {
          // Se o token não é válido, redirecionar para login apenas se estiver na página protegida
          const currentPath = window.location.pathname;
          const isProtectedRoute = currentPath.startsWith('/admin') || 
                                   currentPath.startsWith('/client') || 
                                   currentPath.startsWith('/collaborator') ||
                                   currentPath.startsWith('/freelancer') ||
                                   currentPath === '/dashboard' ||
                                   currentPath === '/cart';
          
          if (isProtectedRoute) {
            window.location.href = '/login';
          }
        }
      } else {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, []); // Removido dependências para evitar loops

  const validateToken = async (token: string, isMounted = true) => {
    try {
      const response = await fetch('http://localhost:4000/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok && isMounted) {
        const userData = await response.json();
        setUser(userData);
        return true; // Token válido
      } else if (isMounted) {
        // Token inválido ou expirado
        localStorage.removeItem('authToken');
        secureStorage.remove('token');
        setUser(null);
        return false; // Token inválido
      }
    } catch (error) {
      console.error('Erro ao validar token:', error);
      if (isMounted) {
        localStorage.removeItem('authToken');
        secureStorage.remove('token');
        setUser(null);
        return false; // Erro na validação
      }
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
    return false;
  };

  const handleOAuthToken = async (token: string) => {
    setIsLoading(true);
    try {
      // Persist token
      localStorage.setItem('authToken', token);
      secureStorage.set('token', token);

      // Validate and set user
      await validateToken(token, true);

      // Wait a bit for user state to update, then navigate
      setTimeout(() => {
        if (user) {
          switch (user.role) {
            case 'ADMIN':
              navigate('/admin/dashboard', { replace: true });
              break;
            case 'COLLABORATOR':
              navigate('/collaborator/dashboard', { replace: true });
              break;
            case 'FREELANCER':
              navigate('/freelancer/dashboard', { replace: true });
              break;
            case 'CLIENT':
              navigate('/client/dashboard', { replace: true });
              break;
            default:
              navigate('/dashboard', { replace: true });
          }
        } else {
          // Fallback if user is still not set
          navigate('/dashboard', { replace: true });
        }
      }, 100);
    } catch (err) {
      console.error('Falha ao processar token OAuth:', err);
      localStorage.removeItem('authToken');
      secureStorage.remove('token');
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithCredentials = async (data: { email: string; password: string }) => {
    setIsLoading(true);
    try {
  // console.log('🔐 Tentando login com:', { email: data.email, passwordLength: data.password.length });

      const response = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

  // console.log('📡 Resposta do servidor:', { status: response.status, ok: response.ok });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('❌ Erro do servidor:', errorData);
        } catch (parseError) {
          console.error('❌ Erro ao fazer parse da resposta:', parseError);
          errorData = { message: `Erro HTTP ${response.status}` };
        }
        throw new Error(errorData.message || 'Erro ao fazer login');
      }

      const responseData = await response.json();
  // console.log('✅ Login bem-sucedido:', { hasToken: !!responseData.token, hasUser: !!responseData.user });

      const { token, user: userData, redirectTo } = responseData;

      // Salvar token nas duas chaves para compatibilidade
      localStorage.setItem('authToken', token);
      secureStorage.set('token', token);
      setUser(userData);

      // Redirecionar automaticamente
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
      } else {
        // fallback: dashboard padrão por role
        switch (userData.role) {
          case 'ADMIN':
            navigate('/admin/dashboard', { replace: true });
            break;
          case 'COLLABORATOR':
            navigate('/collaborator/dashboard', { replace: true });
            break;
          case 'FREELANCER':
            navigate('/freelancer/dashboard', { replace: true });
            break;
          case 'CLIENT':
            navigate('/client/dashboard', { replace: true });
            break;
          default:
            navigate('/dashboard', { replace: true });
        }
      }
    } catch (error) {
      console.error('💥 Erro no login:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    navigate('/login');
  };

  const value: AuthContextType = {
    isAuthenticated: !!user,
    isLoading,
    user,
    logout,
    loginWithCredentials,
  handleOAuthToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
