import React from 'react';
import { clsx } from 'clsx';
import { CheckCircle2 } from 'lucide-react';
import { Card, Button, Checkbox, Select } from '../../../components/ui/StandardComponents';
import { ProfileGeneralPreferences } from '../../../types/types';

interface PreferencesTabProps {
  generalPreferences: ProfileGeneralPreferences;
  setGeneralPreferences: React.Dispatch<React.SetStateAction<ProfileGeneralPreferences>>;
  saving: boolean;
  handleSavePreferences: () => void;
}

// D9 (aprovada em 02/11/2026): a conexão com a Google Agenda saiu das preferências do cliente; ela é
// só do admin (painel). O cliente tem o botão "Google Agenda" na agenda dele, que abre o evento sem
// guardar nada.

export const PreferencesTab: React.FC<PreferencesTabProps> = ({
  generalPreferences,
  setGeneralPreferences,
  saving,
  handleSavePreferences,
}) => {
  const profileTypes = [
    { id: 'individual' as const, label: 'Pessoa física' },
    { id: 'business' as const, label: 'Produtora' },
  ];

  const deliveryMethods = [
    { id: 'delivery' as const, label: 'Entrega no local', sub: 'Levamos os equipamentos até o seu evento' },
    { id: 'pickup' as const, label: 'Retirada', sub: 'Retirada direta em nossa loja' },
  ];

  return (
    <Card>
      <div className="p-6 space-y-8">
        <div className="border-b border-border pb-4">
          <h3 className="text-lg font-semibold text-foreground">Configurações de Conta</h3>
          <p className="text-sm text-muted-foreground">Personalize sua experiência na plataforma</p>
        </div>

        {/* Tipo de Perfil e Identidade Fiscal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground" id="profile-type-label">Tipo de Perfil</p>
            {/* Botões de alternância com aria-pressed (antes o estado só aparecia na cor) */}
            <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="profile-type-label">
              {profileTypes.map((type) => (
                <Button
                  key={type.id}
                  type="button"
                  variant={generalPreferences.profileType === type.id ? 'primary' : 'outline'}
                  size="sm"
                  aria-pressed={generalPreferences.profileType === type.id}
                  onClick={() => setGeneralPreferences(prev => ({ ...prev, profileType: type.id }))}
                >
                  {type.label}
                </Button>
              ))}
            </div>

            <div className="p-4 bg-muted/20 border border-border rounded-lg space-y-2">
              <Checkbox
                label="Faturamento automático"
                checked={generalPreferences.autoInvoice}
                onChange={(e) => setGeneralPreferences(prev => ({ ...prev, autoInvoice: e.target.checked }))}
              />
              <p className="text-sm text-muted-foreground">Emitir notas fiscais (CPF/CNPJ) automaticamente</p>
            </div>
          </div>

          <fieldset className="min-w-0 space-y-4">
            <legend className="mb-4 text-sm font-medium text-foreground">Preferência de Logística</legend>
            <div className="space-y-2">
              {deliveryMethods.map((method) => (
                <label
                  key={method.id}
                  className={clsx(
                    "flex items-center p-3 border rounded-lg cursor-pointer transition-all focus-within:ring-2 focus-within:ring-ring",
                    generalPreferences.defaultDeliveryMethod === method.id ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <input
                    type="radio"
                    name="deliveryMethod"
                    className="h-4 w-4 shrink-0 accent-primary"
                    checked={generalPreferences.defaultDeliveryMethod === method.id}
                    onChange={() => setGeneralPreferences(prev => ({ ...prev, defaultDeliveryMethod: method.id }))}
                  />
                  <span className="ml-3">
                    <span className="block text-sm font-semibold text-foreground">{method.label}</span>
                    <span className="block text-sm text-muted-foreground">{method.sub}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Configurações Locais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border">
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
            label="Fuso horário"
            value={generalPreferences.timezone}
            onChange={(e) => setGeneralPreferences(prev => ({ ...prev, timezone: e.target.value }))}
            options={[
              { value: 'America/Sao_Paulo', label: 'Brasília (BRT)' },
              { value: 'Europe/Lisbon', label: 'Lisboa (WET)' },
              { value: 'Europe/London', label: 'Londres (GMT)' }
            ]}
          />
        </div>

        <div className="pt-6 border-t border-border flex justify-end">
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
