
import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from './ui/StandardComponents';
import { apiFetch } from '../services/api';
import { logger } from '../utils/logger';
import { useNotifications } from '../contexts/NotificationContext';

interface GoogleCalendarIntegrationProps {
  googleCalendarEmail?: string | null;
  // D9: conectada antes, mas o Google recusou a permissão (revogada ou vencida).
  needsReconnect?: boolean;
  onDisconnect?: () => void;
}

// D9 (aprovada em 02/11/2026): a Google Agenda é só do admin. A volta do Google cai no painel com
// ?google_agenda=conectada ou =erro; o aviso aparece uma vez e o parâmetro sai do endereço.
const RETURN_PARAM = 'google_agenda';

export const GoogleCalendarIntegration: React.FC<GoogleCalendarIntegrationProps> = ({
  googleCalendarEmail,
  needsReconnect,
  onDisconnect
}) => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const { addNotification } = useNotifications();

  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get(RETURN_PARAM);
    if (!result) return;
    if (result === 'conectada') {
      addNotification({ type: 'success', title: 'Google Agenda conectada', message: 'As reservas confirmadas passam a entrar na sua agenda.' });
    } else {
      addNotification({ type: 'error', title: 'Google Agenda não conectada', message: 'O Google não confirmou a conexão. Tente de novo.' });
    }
    url.searchParams.delete(RETURN_PARAM);
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, [addNotification]);

  const handleConnectGoogle = async () => {
    try {
      setGoogleLoading(true);
      const data = await apiFetch<{ url: string }>('/google/connect') as { url: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      logger.error('Erro ao conectar Google:', 'GoogleCalendarIntegration', error);
      // Antes a falha ia só para o log: o botão voltava ao normal sem nenhum aviso.
      addNotification({ type: 'error', title: 'Erro ao conectar', message: 'Não foi possível conectar o Google Agenda. Tente de novo.' });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      setGoogleLoading(true);
      const result = await apiFetch<{ revokedAtGoogle?: boolean }>('/google/disconnect', { method: 'POST' });
      if (result && result.revokedAtGoogle === false) {
        addNotification({
          type: 'warning',
          title: 'Desconectada aqui',
          message: 'O Google não respondeu ao cancelamento da permissão. Para garantir, remova o acesso da X Produções em myaccount.google.com/permissions.',
        });
      }
      if (onDisconnect) {
          onDisconnect();
      } else {
          window.location.reload();
      }
    } catch (error) {
      logger.error('Erro ao desconectar Google:', 'GoogleCalendarIntegration', error);
      addNotification({ type: 'error', title: 'Erro ao desconectar', message: 'Não foi possível desconectar o Google Agenda. Tente de novo.' });
    } finally {
      setGoogleLoading(false);
    }
  };

  // Sem moldura nem título próprios: quem usa já põe o componente dentro de um card (painel admin,
  // perfil do colaborador). Antes: card dentro de card e um segundo título "Integrações".
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-4 min-w-0">
            <div className="p-2 bg-info/10 text-info rounded-lg shrink-0">
                <Calendar className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
                <div className="font-medium text-foreground">Google Agenda</div>
                <div className={needsReconnect ? 'text-sm text-warning break-words' : 'text-sm text-muted-foreground break-words'} role={needsReconnect ? 'status' : undefined}>
                    {needsReconnect
                        ? `Reconecte sua Google Agenda${googleCalendarEmail ? ` (${googleCalendarEmail})` : ''}: o Google deixou de aceitar a permissão.`
                        : googleCalendarEmail
                        ? `Conectado como ${googleCalendarEmail}`
                        : 'Sincronize sua agenda automaticamente'}
                </div>
            </div>
        </div>
        <div className="shrink-0">
            {needsReconnect ? (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConnectGoogle}
                    isLoading={googleLoading}
                >
                    Reconectar
                </Button>
            ) : googleCalendarEmail ? (
                <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/40 hover:bg-destructive/5"
                    onClick={handleDisconnectGoogle}
                    isLoading={googleLoading}
                >
                    Desconectar
                </Button>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConnectGoogle}
                    isLoading={googleLoading}
                >
                    Conectar
                </Button>
            )}
        </div>
    </div>
  );
};
