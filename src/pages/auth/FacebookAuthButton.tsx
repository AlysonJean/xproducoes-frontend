import React from 'react';
import { appendScriptIfNotExists } from '../../utils/dom';
import { openOAuthPopup } from '../../utils/oauthPopup';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { secureStorage } from '../../utils/secureStorage';
import { useNotifications } from '../../contexts/NotificationContext';

interface FacebookAuthButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    FB: {
      init: (params: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      login: (
        callback: (response: { authResponse?: { accessToken: string } }) => void,
        options: { scope: string }
      ) => void;
      api: (
        path: string,
        params: { fields: string },
        callback: (userInfo: {
          id: string;
          name: string;
          email: string;
          picture?: { data: { url: string } };
        }) => void
      ) => void;
    };
    fbAsyncInit: () => void;
  }
}

export const FacebookAuthButton: React.FC<FacebookAuthButtonProps> = ({
  onSuccess,
  onError,
  disabled = false,
}) => {
  const auth = useAuth();
  const { addNotification } = useNotifications();

  React.useEffect(() => {
    // Carregar SDK do Facebook
    if (!window.FB) {
      window.fbAsyncInit = function () {
        window.FB.init({
          appId: import.meta.env.VITE_FACEBOOK_APP_ID || 'your-facebook-app-id',
          cookie: true,
          xfbml: true,
          version: 'v18.0',
        });
      };

      // Carregar SDK assíncronamente, evitando injeção duplicada
      try {
        appendScriptIfNotExists({ src: 'https://connect.facebook.net/pt_BR/sdk.js', async: true, defer: true, crossOrigin: 'anonymous' });
      } catch (err) {
        // Não bloquear o fluxo de login apenas por falha na injeção do SDK
        console.warn('Falha ao injetar Facebook SDK:', err instanceof Error ? err.message : err);
      }
    }
  }, []);

  const handleFacebookLogin = async () => {
    try {
      const res = await api.get('/auth/oauth/facebook/authorize');
      const popup = openOAuthPopup(res.data.url, 'facebook_oauth');
      const listener = async (ev: MessageEvent) => {
        if (ev.origin !== window.location.origin) return;
        const data = ev.data as any;
        if (data?.type === 'oauth_token' && data?.token) {
          if (auth?.handleOAuthToken) {
            try {
              await auth.handleOAuthToken(data.token);
            } catch (err) {
              console.error('Erro ao processar token OAuth (Facebook):', err);
            }
          } else {
            localStorage.setItem('authToken', data.token);
            secureStorage.set('token', data.token);
          }
          window.removeEventListener('message', listener);
          try { popup?.close(); } catch {}
          onSuccess?.();
        }
      };
      window.addEventListener('message', listener);
    } catch (err) {
      addNotification({ type: 'error', title: 'Erro no login', message: 'Falha ao iniciar login com Facebook' });
      onError?.('Falha ao iniciar login com Facebook');
    }
  };

  return (
    <div className="w-full">
      <button
        onClick={handleFacebookLogin}
        disabled={disabled}
        className={`w-full font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 ${
          disabled
            ? 'bg-gray-400 text-white opacity-50 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
        }`}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        <span>Continuar com Facebook</span>
      </button>
    </div>
  );
};
