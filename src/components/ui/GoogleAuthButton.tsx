import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import type { GoogleAuthButtonProps } from '@/types/ui';
import { useNotifications } from '@/contexts/NotificationContext';
import axios from 'axios';
import { API_BASE_URL } from '@/utils/apiConfig';
import { logger } from '../../utils/logger';

const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotifications();
  
  // Verificar se o Google Client ID está configurado
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isConfigured = !!googleClientId && googleClientId !== 'your-google-client-id';

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        // Enviar access_token para o backend validar diretamente com Google
        // Backend irá configurar httpOnly cookies automaticamente
        const response = await axios.post(`${API_BASE_URL}/auth/social/google`, {
          provider: 'google',
          accessToken: tokenResponse.access_token
        }, {
          withCredentials: true, // Include cookies
        });

        // ✅ Backend handles cookie setup - no need to store tokens
        // Tokens are in httpOnly cookies, not accessible from JS
        
        // Just use the user data and redirect
        addNotification({
          type: 'success',
          title: 'Login com Google',
          message: `Bem-vindo, ${response.data.user?.name || 'Usuário'}!`
        });

        if (onSuccess) onSuccess(response.data);
        
        // Aguardar um pouco para o AuthContext detectar o novo cookie antes de redirecionar
        setTimeout(() => {
          if (response.data.shouldCompleteProfile) {
            window.location.href = '/completar-perfil';
          } else {
            window.location.href = response.data.redirectTo || '/painel';
          }
        }, 500);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          logger.error('Erro no login Google:', 'GoogleAuthButton', error.response?.data);
        }
        addNotification({
          type: 'error',
          title: 'Erro de Autenticação',
          message: axios.isAxiosError(error) && error.response?.data?.message 
            ? error.response.data.message 
            : `Falha ao conectar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        });
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: 'Cancelado',
        message: 'Login com Google cancelado.'
      });
    }
  });

  // Não renderizar o botão se o Google não está configurado
  if (!isConfigured) {
    if (import.meta.env.DEV) {
      logger.warn('Google OAuth não configurado: VITE_GOOGLE_CLIENT_ID não definido', 'GoogleAuthButton');
    }
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => login()}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 py-2 px-4 rounded font-medium transition-colors shadow-sm"
    >
      {loading ? (
        <span className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            className="text-blue-600"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            className="text-green-600"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            className="text-yellow-500"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            className="text-red-600"
          />
        </svg>
      )}
      Entrar com Google
    </button>
  );
};

export default GoogleAuthButton;
