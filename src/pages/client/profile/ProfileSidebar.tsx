import React from 'react';
import { Activity, Award, Star, Shield } from 'lucide-react';
import { Card, Button } from '../../../components/ui/StandardComponents';

export const ProfileSidebar: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Activity Card */}
      <Card>
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Atividade Recente</h3>
          </div>
          
          <div className="space-y-3">
            {[
              { label: 'Perfil atualizado', time: 'Há 2 horas', color: 'bg-primary' },
              { label: 'Nova reserva criada', time: 'Ontem', color: 'bg-success' },
              { label: 'Foto de perfil alterada', time: '3 dias atrás', color: 'bg-warning' }
            ].map((item, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${item.color}`}></div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
      
      {/* Badges Card */}
      <Card>
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Award className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Conquistas</h3>
          </div>
          
          <div className="space-y-3">
            {[
              { label: 'Cliente Premium', sub: '5+ reservas', icon: Star, iconColor: 'bg-yellow-500' },
              { label: 'Conta Verificada', sub: 'Email confirmado', icon: Shield, iconColor: 'bg-blue-500' }
            ].map((badge, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${badge.iconColor}`}>
                  <badge.icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{badge.label}</p>
                  <p className="text-xs text-muted-foreground">{badge.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
      
      {/* Danger Zone */}
      <Card>
        <div className="p-6">
          <h3 className="font-semibold text-destructive mb-4">Zona de Perigo</h3>
          
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              className="text-destructive border-destructive hover:bg-destructive hover:text-white"
            >
              Desativar Conta
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              fullWidth
              className="text-destructive border-destructive hover:bg-destructive hover:text-white"
            >
              Excluir Conta
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
