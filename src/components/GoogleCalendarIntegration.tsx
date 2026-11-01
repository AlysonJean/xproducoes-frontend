
import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from './ui/StandardComponents';
import { apiFetch } from '../services/api';
import { logger } from '../utils/logger';
import { useNotifications } from '../contexts/NotificationContext';

interface GoogleCalendarIntegrationProps {
  googleCalendarEmail?: string | null;
  onDisconnect?: () => void;
}

export const GoogleCalendarIntegration: React.FC<GoogleCalendarIntegrationProps> = ({
  googleCalendarEmail,
  onDisconnect
}) => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const { addNotification } = useNotifications();

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
      await apiFetch('/google/disconnect', { method: 'POST' });
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
                <div className="text-sm text-muted-foreground break-words">
                    {googleCalendarEmail
                        ? `Conectado como ${googleCalendarEmail}`
                        : 'Sincronize sua agenda automaticamente'}
                </div>
            </div>
        </div>
        <div className="shrink-0">
            {googleCalendarEmail ? (
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
