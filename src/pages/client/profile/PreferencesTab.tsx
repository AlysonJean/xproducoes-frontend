import React, { useState } from 'react';
import { clsx } from 'clsx';
import { CheckCircle2, Calendar } from 'lucide-react';
import { Card, Button, Checkbox, Select } from '../../../components/ui/StandardComponents';
import { ProfileGeneralPreferences } from '../../../types/types';
import { apiFetch } from '../../../services/api';

interface PreferencesTabProps {
  generalPreferences: ProfileGeneralPreferences;
  setGeneralPreferences: React.Dispatch<React.SetStateAction<ProfileGeneralPreferences>>;
  saving: boolean;
  handleSavePreferences: () => void;
  googleCalendarEmail?: string | null;
}

export const PreferencesTab: React.FC<PreferencesTabProps> = ({
  generalPreferences,
  setGeneralPreferences,
  saving,
  handleSavePreferences,
  googleCalendarEmail
}) => {
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleConnectGoogle = async () => {
    try {
      setGoogleLoading(true);
      const data = await apiFetch<{ url: string }>('/google/connect');
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Erro ao conectar Google:', error);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      setGoogleLoading(true);
      await apiFetch('/google/disconnect', { method: 'POST' });
      window.location.reload(); // Recarregar para atualizar estado
    } catch (error) {
      console.error('Erro ao desconectar Google:', error);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Card>
      <div className="p-6 space-y-8">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Configurações de Conta</h3>
            <p className="text-sm text-muted-foreground">Personalize sua experiência na plataforma</p>
          </div>
        </div>
        
        {/* Integrações */}
        <div className="pt-4 pb-4 border-b">
            <h4 className="text-sm font-medium text-foreground mb-4">Integrações</h4>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="font-medium">Google Calendar</div>
                        <div className="text-sm text-muted-foreground">
                            {googleCalendarEmail 
                                ? `Conectado como ${googleCalendarEmail}` 
                                : 'Sincronize suas reservas automaticamente'}
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

        {/* Tipo de Perfil e Identidade Fiscal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="text-sm font-medium text-foreground">Tipo de Perfil</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={generalPreferences.profileType === 'individual' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setGeneralPreferences(prev => ({ ...prev, profileType: 'individual' }))}
                className="font-bold"
              >
                INDIVIDUAL
              </Button>
              <Button
                variant={generalPreferences.profileType === 'business' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setGeneralPreferences(prev => ({ ...prev, profileType: 'business' }))}
                className="font-bold"
              >
                PRODUTORA
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/20 border rounded-lg">
              <div>
                <p className="text-sm font-medium">Faturamento Automático</p>
                <p className="text-xs text-muted-foreground">Gerar invoices (NIF/CNPJ) automaticamente</p>
              </div>
              <Checkbox
                checked={generalPreferences.autoInvoice}
                onChange={(e) => setGeneralPreferences(prev => ({ ...prev, autoInvoice: e.target.checked }))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-foreground">Preferência de Logística</label>
            <div className="space-y-2">
              <label className={clsx(
                "flex items-center p-3 border rounded-lg cursor-pointer transition-all",
                generalPreferences.defaultDeliveryMethod === 'delivery' ? "border-primary bg-primary/5" : "border-border"
              )}>
                <input
                  type="radio"
                  name="deliveryMethod"
                  className="text-primary focus:ring-primary h-4 w-4"
                  checked={generalPreferences.defaultDeliveryMethod === 'delivery'}
                  onChange={() => setGeneralPreferences(prev => ({ ...prev, defaultDeliveryMethod: 'delivery' }))}
                />
                <div className="ml-3">
                  <p className="text-sm font-bold">ENTREGA NO LOCAL</p>
                  <p className="text-xs text-muted-foreground">Logística para o set de filmagem</p>
                </div>
              </label>
              <label className={clsx(
                "flex items-center p-3 border rounded-lg cursor-pointer transition-all",
                generalPreferences.defaultDeliveryMethod === 'pickup' ? "border-primary bg-primary/5" : "border-border"
              )}>
                <input
                  type="radio"
                  name="deliveryMethod"
                  className="text-primary focus:ring-primary h-4 w-4"
                  checked={generalPreferences.defaultDeliveryMethod === 'pickup'}
                  onChange={() => setGeneralPreferences(prev => ({ ...prev, defaultDeliveryMethod: 'pickup' }))}
                />
                <div className="ml-3">
                  <p className="text-sm font-bold">RETIRADA NO HUB</p>
                  <p className="text-xs text-muted-foreground">Retirada direta em nossa loja</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Configurações Locais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
          <Select
            label="Idioma da Interface"
            value={generalPreferences.language}
            onChange={(e) => setGeneralPreferences(prev => ({ ...prev, language: e.target.value }))}
            options={[
              { value: 'pt', label: 'Português (BR)' },
              { value: 'en', label: 'English (US)' },
              { value: 'es', label: 'Español' }
            ]}
          />
          <Select
            label="Moeda Principal"
            value={generalPreferences.currency}
            onChange={(e) => setGeneralPreferences(prev => ({ ...prev, currency: e.target.value }))}
            options={[
              { value: 'BRL', label: 'Real (R$)' },
              { value: 'EUR', label: 'Euro (€)' },
              { value: 'USD', label: 'Dólar ($)' }
            ]}
          />
          <Select
            label="Timezone"
            value={generalPreferences.timezone}
            onChange={(e) => setGeneralPreferences(prev => ({ ...prev, timezone: e.target.value }))}
            options={[
              { value: 'America/Sao_Paulo', label: 'Brasília (BRT)' },
              { value: 'Europe/Lisbon', label: 'Lisboa (WET)' },
              { value: 'Europe/London', label: 'Londres (GMT)' }
            ]}
          />
        </div>

        <div className="pt-6 border-t flex justify-end">
          <Button 
            variant="primary" 
            onClick={handleSavePreferences}
            isLoading={saving}
            leftIcon={<CheckCircle2 className="h-4 w-4" />}
          >
            Salvar Alterações
          </Button>
        </div>
      </div>
    </Card>
  );
};
