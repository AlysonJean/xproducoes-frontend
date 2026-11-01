import React from 'react';
import { CheckCircle2 } from 'lucide-react';
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

  // Achado (auditoria): "Monitoramento de Carga", "Alertas de estoque" e "Segurança e Operação
  // Técnica" prometiam avisos que o sistema não envia (não há rastreio de entrega, alerta de
  // estoque nem envio de manuais). Fica só o que o servidor consulta: Status de Reserva.
  const sections = [
    {
      title: 'Reservas',
      items: [
        { id: 'bookingUpdates', label: 'Status de Reserva', sub: 'Recebimento do pedido, confirmação e lembrete da véspera' }
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
