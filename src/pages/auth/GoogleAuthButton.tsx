import React, { useRef, useContext } from 'react';
// removed GoogleLogin one-tap to centralize popup-based OAuth
import { openOAuthPopup } from '../../utils/oauthPopup';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import { secureStorage } from '../../utils/secureStorage';
import { NotificationContext } from '../../contexts/NotificationContext';

interface GoogleAuthButtonProps {
  onSuccess?: () => void;
  disabled?: boolean;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onSuccess,
  disabled = false,
}) => {
  // Read contexts directly with useContext (no custom hooks) to avoid throws
  // and guarantee synchronous rendering in test environments that may omit
  // providers.
  const authContext = useContext(AuthContext) as any | undefined;
  const notifContext = useContext(NotificationContext) as any | undefined;
  const authRef = useRef<any>(authContext);
  const notifRef = useRef<any>(notifContext);

  const handleMessage = async (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data as any;
    if (data?.type === 'oauth_token' && data?.token) {
      const auth = authRef.current;
      if (auth?.handleOAuthToken) {
        try {
          await auth.handleOAuthToken(data.token);
        } catch (err) {
          console.error('Erro ao processar token OAuth (Google):', err);
        }
      } else {
        localStorage.setItem('authToken', data.token);
        secureStorage.set('token', data.token);
      }
      onSuccess?.();
    }
  };

  // Popup flow will handle success/error via postMessage and AuthContext

  // Keep refs up-to-date
  authRef.current = authContext;
  notifRef.current = notifContext;
  const addNotification = notifRef.current?.addNotification;

  return (
    <div className="w-full">
      <div className="space-y-2">
        {/* Popup-based OAuth flow - render button always so tests can query it */}
        <button
          type="button"
          disabled={disabled}
          className={`w-full bg-red-700 hover:bg-red-800 text-white py-2 px-4 rounded font-bold transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={async () => {
            if (disabled) return;
            try {
              const res = await api.get('/auth/oauth/google/authorize');
              const popup = openOAuthPopup(res.data.url, 'google_oauth');
              const listener = (ev: MessageEvent) => handleMessage(ev);
              window.addEventListener('message', listener);
              // cleanup if popup closed or after some timeout
              const monitor = setInterval(() => {
                try {
                  if (!popup || popup.closed) {
                    window.removeEventListener('message', listener);
                    clearInterval(monitor);
                  }
                } catch (e) {
                  window.removeEventListener('message', listener);
                  clearInterval(monitor);
                }
              }, 500);
            } catch (e) {
              console.error('Falha ao iniciar fluxo OAuth (Google):', e);
              addNotification?.({ type: 'error', title: 'Erro no login', message: 'Falha ao iniciar login com Google' });
            }
          }}
        >
          Entrar com Google (popup)
        </button>
      </div>
    </div>
  );
};
