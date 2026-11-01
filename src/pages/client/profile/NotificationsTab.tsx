import React from 'react';
import { Shield, CheckCircle2 } from 'lucide-react';
import { Card, Button, Checkbox } from '../../../components/ui/StandardComponents';
import { ProfileNotificationPreferences } from '../../../types/types';

interface NotificationsTabProps {
  notificationPreferences: ProfileNotificationPreferences;
  setNotificationPreferences: React.Dispatch<React.SetStateAction<ProfileNotificationPreferences>>;
  saving: boolean;
  handleSavePreferences: () => void;
}

// Rótulos dos canais em pt-BR (antes: "Email" / "Push"). As chaves das preferências
// (…Email / …Push) não mudam — são as que o backend guarda.
const CHANNEL_LABEL = { Email: 'E-mail', Push: 'Notificação' } as const;

export const NotificationsTab: React.FC<NotificationsTabProps> = ({
  notificationPreferences,
  setNotificationPreferences,
  saving,
  handleSavePreferences
}) => {
  const updatePref = (id: string, type: 'Email' | 'Push', checked: boolean) => {
    setNotificationPreferences(prev => ({ ...prev, [`${id}${type}`]: checked }));
  };

  const sections = [
    {
      title: 'Movimentação e Logística',
      items: [
        { id: 'bookingUpdates', label: 'Status de Reserva', sub: 'Confirmações e alterações' },
        { id: 'logisticsUpdates', label: 'Monitoramento de Carga', sub: 'Rastreio de motorista e montagem' }
      ]
    }
  ];

  return (
    <Card>
      <div className="p-6 space-y-8">
        <div className="border-b border-border pb-4">
          <h3 className="text-lg font-semibold text-foreground">Alertas Operacionais</h3>
          <p className="text-sm text-muted-foreground">Gerencie como você recebe atualizações sobre suas produções</p>
        </div>

        {sections.map(section => (
          <div key={section.title} className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{section.title}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.items.map((pkg) => (
                // fieldset + legend: os dois checkboxes ("E-mail", "Notificação") ficam ligados ao assunto.
                // `float-left w-full` tira a legend de cima da borda (renderização padrão do navegador).
                <fieldset key={pkg.id} className="min-w-0 p-4 border border-border rounded-lg bg-muted/20">
                  <legend className="float-left w-full font-medium text-foreground">{pkg.label}</legend>
                  <div className="clear-left flex flex-col space-y-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">{pkg.sub}</p>
                    <div className="flex flex-wrap items-center gap-6">
                      {(['Email', 'Push'] as const).map((channel) => (
                        <Checkbox
                          key={channel}
                          label={CHANNEL_LABEL[channel]}
                          checked={notificationPreferences[`${pkg.id}${channel}` as keyof ProfileNotificationPreferences]}
                          onChange={(e) => updatePref(pkg.id, channel, e.target.checked)}
                        />
                      ))}
                    </div>
                  </div>
                </fieldset>
              ))}
            </div>
          </div>
        ))}

        {/* Seção 2: Alertas de Inventário */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Disponibilidade</h4>
          <fieldset className="min-w-0 p-5 border rounded-lg bg-primary/5 border-primary/20">
            <legend className="float-left w-full font-medium text-foreground">Alertas de estoque</legend>
            <div className="clear-left flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mt-1">
                  Avisar quando equipamentos em falta retornarem ou novos kits forem lançados.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <Checkbox
                  label={CHANNEL_LABEL.Email}
                  checked={notificationPreferences.inventoryAlertsEmail}
                  onChange={(e) => setNotificationPreferences(prev => ({ ...prev, inventoryAlertsEmail: e.target.checked }))}
                />
                <Checkbox
                  label={CHANNEL_LABEL.Push}
                  checked={notificationPreferences.inventoryAlertsPush}
                  onChange={(e) => setNotificationPreferences(prev => ({ ...prev, inventoryAlertsPush: e.target.checked }))}
                />
              </div>
            </div>
          </fieldset>
        </div>

        {/* Seção 3: Suporte Técnico */}
        <div className="p-4 border rounded-lg border-warning/30 bg-warning/5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
            <div>
              <p className="font-semibold text-sm text-foreground">Segurança e Operação Técnica</p>
              <p className="text-sm text-muted-foreground">Manuais, recalls e avisos críticos de uso</p>
            </div>
          </div>
          {/* Antes sem rótulo: o leitor de tela anunciava só "caixa de seleção". */}
          <Checkbox
            label="Receber por e-mail"
            checked={notificationPreferences.technicalUpdatesEmail}
            onChange={(e) => setNotificationPreferences(prev => ({ ...prev, technicalUpdatesEmail: e.target.checked }))}
          />
        </div>

        <div className="pt-6 border-t border-border flex justify-end">
          <Button
            variant="primary"
            onClick={handleSavePreferences}
            isLoading={saving}
            leftIcon={<CheckCircle2 className="h-4 w-4" />}
          >
            Salvar Preferências
          </Button>
        </div>
      </div>
    </Card>
  );
};
