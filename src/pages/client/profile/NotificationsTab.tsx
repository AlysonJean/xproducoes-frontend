/* eslint-disable @typescript-eslint/no-explicit-any */
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
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Alertas Operacionais</h3>
            <p className="text-sm text-muted-foreground">Gerencie como você recebe atualizações sobre suas produções</p>
          </div>
        </div>
        
        {sections.map(section => (
          <div key={section.title} className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{section.title}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.items.map((pkg) => (
                <div key={pkg.id} className="p-4 border rounded-lg bg-muted/20">
                  <div className="flex flex-col space-y-3">
                    <div>
                        <p className="font-medium text-foreground">{pkg.label}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{pkg.sub}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <Checkbox
                        label="Email"
                                                checked={(notificationPreferences as any)[`${pkg.id}Email`]}
                        onChange={(e) => updatePref(pkg.id, 'Email', e.target.checked)}
                      />
                      <Checkbox
                        label="Push"
                                                checked={(notificationPreferences as any)[`${pkg.id}Push`]}
                        onChange={(e) => updatePref(pkg.id, 'Push', e.target.checked)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Seção 2: Alertas de Inventário */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Disponibilidade</h4>
          <div className="p-5 border rounded-lg bg-primary/5 border-primary/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <p className="font-medium text-foreground">Alertas de Stock</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Avisar quando equipamentos em falta retornarem ou novos kits forem lançados.
                </p>
              </div>
              <div className="flex items-center gap-6">
                <Checkbox
                  label="Email"
                  checked={notificationPreferences.inventoryAlertsEmail}
                  onChange={(e) => setNotificationPreferences(prev => ({ ...prev, inventoryAlertsEmail: e.target.checked }))}
                />
                <Checkbox
                  label="Push"
                  checked={notificationPreferences.inventoryAlertsPush}
                  onChange={(e) => setNotificationPreferences(prev => ({ ...prev, inventoryAlertsPush: e.target.checked }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Seção 3: Suporte Técnico */}
        <div className="p-4 border rounded-lg border-warning/30 bg-warning/5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-warning" />
            <div>
              <p className="font-semibold text-sm text-foreground">Segurança e Operação Técnica</p>
              <p className="text-xs text-muted-foreground">Manuais, recalls e avisos críticos de uso</p>
            </div>
          </div>
          <Checkbox
            checked={notificationPreferences.technicalUpdatesEmail}
            onChange={(e) => setNotificationPreferences(prev => ({ ...prev, technicalUpdatesEmail: e.target.checked }))}
          />
        </div>

        <div className="pt-6 border-t flex justify-end">
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
