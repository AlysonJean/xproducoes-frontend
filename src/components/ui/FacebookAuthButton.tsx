import React, { useState, useEffect } from 'react';
import { FacebookAuthButtonProps } from '@/types/ui';
import { useNotifications } from '@/contexts/NotificationContext';
import axios from 'axios';
import { secureStorage } from '@/utils/secureStorage';

// Declaração do SDK do Facebook
declare global {
  interface Window {
    FB: {
      init: (params: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      login: (
        callback: (response: { authResponse?: { accessToken: string } }) => void,
        options: { scope: string }
      ) => void;
      getLoginStatus: (callback: (response: { status: string; authResponse?: { accessToken: string } }) => void) => void;
    };
    fbAsyncInit: () => void;
  }
}

const FacebookAuthButton: React.FC<FacebookAuthButtonProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const { addNotification } = useNotifications();

  const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;

  useEffect(() => {
    // Se não tem App ID configurado, não carregar o SDK
    if (!FACEBOOK_APP_ID) {
      console.warn('VITE_FACEBOOK_APP_ID não configurado');
      return;
    }

    // Carregar SDK do Facebook
    if (!window.FB) {
      window.fbAsyncInit = function () {
        window.FB.init({
          appId: FACEBOOK_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v18.0',
        });
        setSdkLoaded(true);
      };

      // Carregar script do Facebook
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/pt_BR/sdk.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    } else {
      // SDK já carregado - usar requestAnimationFrame para evitar setState síncrono
      requestAnimationFrame(() => setSdkLoaded(true));
    }
  }, [FACEBOOK_APP_ID]);

  const handleFacebookLogin = () => {
    if (!window.FB) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Facebook SDK não carregado. Tente novamente.',
      });
      return;
    }

    setLoading(true);

    window.FB.login(
      async (response) => {
        if (response.authResponse) {
          try {
            const accessToken = response.authResponse.accessToken;
            
            // Enviar para o backend validar
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.xproducoeseeventos.com.br/api/v1';
            
            const backendResponse = await axios.post(`${API_BASE_URL}/auth/social/facebook`, {
              accessToken,
            });

            if (backendResponse.data.token) {
              // Salvar tokens
              secureStorage.set('accessToken', backendResponse.data.token);
              if (backendResponse.data.refreshToken) {
                secureStorage.set('refreshToken', backendResponse.data.refreshToken);
              }
              const expiresAt = Date.now() + 15 * 60 * 1000;
              secureStorage.set('tokenExpiresAt', expiresAt.toString());
              
              localStorage.setItem('user', JSON.stringify(backendResponse.data.user));
              
              addNotification({
                type: 'success',
                title: 'Login com Facebook',
                message: `Bem-vindo, ${backendResponse.data.user?.name || 'Usuário'}!`,
              });

              if (onSuccess) onSuccess(backendResponse.data);
              
              window.location.href = '/cliente/painel';
            }
          } catch (error) {
            console.error('Erro no login Facebook:', error);
            addNotification({
              type: 'error',
              title: 'Erro de Autenticação',
              message: axios.isAxiosError(error) && error.response?.data?.message
                ? error.response.data.message
                : 'Falha ao conectar com Facebook.',
            });
          }
        } else {
          addNotification({
            type: 'info',
            title: 'Cancelado',
            message: 'Login com Facebook cancelado.',
          });
        }
        setLoading(false);
      },
      { scope: 'email,public_profile' }
    );
  };

  // Se não tem App ID, não mostrar o botão
  if (!FACEBOOK_APP_ID) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleFacebookLogin}
      disabled={loading || !sdkLoaded}
      className="w-full flex items-center justify-center gap-2 bg-[#1877F2] hover:bg-[#166FE5] text-white py-2 px-4 rounded font-medium transition-colors shadow-sm disabled:opacity-50"
    >
      {loading ? (
        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
      ) : (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      )}
      Entrar com Facebook
    </button>
  );
};

export default FacebookAuthButton;
