
import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from './ui/StandardComponents';
import { apiFetch } from '../services/api';
import { logger } from '../utils/logger';

interface GoogleCalendarIntegrationProps {
  googleCalendarEmail?: string | null;
  onDisconnect?: () => void;
}

export const GoogleCalendarIntegration: React.FC<GoogleCalendarIntegrationProps> = ({
  googleCalendarEmail,
  onDisconnect
}) => {
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleConnectGoogle = async () => {
    try {
      setGoogleLoading(true);
      const data = await apiFetch<{ url: string }>('/google/connect') as { url: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      logger.error('Erro ao conectar Google:', 'GoogleCalendarIntegration', error);
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
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="pt-4 pb-4 border-b w-full">
        <h4 className="text-sm font-medium text-foreground mb-4">Integrações</h4>
        <div className="flex items-center justify-between p-4 border rounded-lg bg-card shadow-sm">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Calendar className="h-6 w-6" />
                </div>
                <div>
                    <div className="font-medium text-gray-900">Google Calendar</div>
                    <div className="text-sm text-gray-500">
                        {googleCalendarEmail 
                            ? `Conectado como ${googleCalendarEmail}` 
                            : 'Sincronize sua agenda automaticamente'}
                    </div>
                </div>
            </div>
            <div>
                {googleCalendarEmail ? (
                    <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
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
    </div>
  );
};
