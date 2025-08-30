// Caminho: frontend/src/pages/LoginPage.tsx

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Link, useNavigate } from 'react-router-dom';
import GoogleAuthButton from '../components/ui/GoogleAuthButton';
import FacebookAuthButton from '../components/ui/FacebookAuthButton';
import LoadingSpinner from '../components/LoadingSpinner';
import { getDashboardRoute } from '../utils/authUtils';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'client' | 'collaborator'>('client');
  const { loginWithCredentials } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const redirectTo = await loginWithCredentials?.({ email, password });
      
      addNotification({
        type: 'success',
        title: 'Login realizado!',
        message: 'Bem-vindo!',
      });

      // Redirecionar usando a rota fornecida pelo backend
      if (redirectTo) {
        navigate(redirectTo);
      } else {
        // Fallback para rota padrão
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Falha no login. Verifique as suas credenciais.';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Erro no login',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSuccess = async () => {
    // Para login social, verificar role e redirecionar
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const response = await fetch('http://localhost:4000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const userData = await response.json();
          const dashboardRoute = getDashboardRoute(userData.role);
          navigate(dashboardRoute);
        } else {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        navigate('/dashboard');
      }
    } else {
      navigate('/dashboard');
    }
  };

  const handleSocialError = (error: unknown) => {
    let message = 'Erro desconhecido no login social.';
    if (typeof error === 'string') message = error;
    else if (error && typeof error === 'object' && 'message' in error)
      message = String((error as { message?: unknown }).message);
    setError(message);
    // Notificação pode ser adicionada aqui se desejar
  };

  return (
      <div className="flex justify-center items-center min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md bg-card border border-border p-8 rounded-lg shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-primary rounded-lg flex items-center justify-center mb-4">
              <svg
                className="h-6 w-6 text-primary-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Login</h1>
            <p className="text-muted-foreground">Acesse sua conta</p>
          </div>

          {/* Toggle Tipo de Usuário */}
          <div className="flex rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setUserType('client')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                userType === 'client'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Cliente</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setUserType('collaborator')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                userType === 'collaborator'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
                <span>Colaborador</span>
              </div>
            </button>
          </div>

          {/* Botões de Login Social - apenas para clientes */}
          {userType === 'client' && (
            <div className="space-y-3">
              <GoogleAuthButton onSuccess={handleSocialSuccess} onFailure={handleSocialError} />

              <FacebookAuthButton onSuccess={handleSocialSuccess} onFailure={handleSocialError} />
            </div>
          )}

          {/* Divisor */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">
                {userType === 'client' ? 'Ou continue com email' : 'Entre com suas credenciais'}
              </span>
            </div>
          </div>

          {/* Formulário de Login */}
          {error && <div className="bg-destructive/20 text-destructive p-3 rounded-md border border-destructive/40">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-foreground mb-2" htmlFor="email">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                className="w-full bg-background border border-border rounded-md py-2 px-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-foreground mb-2" htmlFor="password">
                Senha
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                className="w-full bg-background border border-border rounded-md py-2 px-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Sua senha"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-border rounded bg-background"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-muted-foreground">
                  Lembrar de mim
                </label>
              </div>

              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Esqueceu sua senha?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground font-bold py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Entrando...</span>
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Não tem uma conta?{' '}
              <Link to="/register" className="text-primary hover:text-primary/80">
                Registe-se
              </Link>
            </p>

            <p className="text-xs text-muted-foreground">
              Ao fazer login, você concorda com nossos{' '}
              <Link to="/terms" className="text-primary hover:text-primary/80">
                Termos de Serviço
              </Link>{' '}
              e{' '}
              <Link to="/privacy" className="text-primary hover:text-primary/80">
                Política de Privacidade
              </Link>
            </p>
          </div>
        </div>
  </div>
  );
};
