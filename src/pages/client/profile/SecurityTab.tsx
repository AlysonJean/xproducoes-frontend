import React from 'react';
import { Card, Input, Button } from '../../../components/ui/StandardComponents';
import { ProfilePasswordForm } from '../../../types/types';

interface SecurityTabProps {
  passwordForm: ProfilePasswordForm;
  setPasswordForm: (form: ProfilePasswordForm) => void;
  saving: boolean;
  handleChangePassword: () => void;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({
  passwordForm,
  setPasswordForm,
  saving,
  handleChangePassword
}) => {
  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">Segurança da Conta</h3>
        
        <div className="space-y-6">
          {/* Alterar Senha */}
          <div className="border border-border rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-4">Alterar Senha</h4>
            
            <div className="space-y-4">
              <Input
                label="Senha atual"
                showPasswordToggle
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                autoComplete="current-password"
              />
              
              <Input
                label="Nova senha"
                showPasswordToggle
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
              
              <Input
                label="Confirmar nova senha"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Confirme a nova senha"
                autoComplete="new-password"
              />
              
              <Button
                variant="primary"
                onClick={handleChangePassword}
                isLoading={saving}
                disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              >
                Alterar Senha
              </Button>
            </div>
          </div>
          
          {/* Autenticação de Dois Fatores */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground">Autenticação de Dois Fatores</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Adicione uma camada extra de segurança à sua conta
                </p>
              </div>
              <Button variant="outline" size="sm">
                Configurar
              </Button>
            </div>
          </div>
          
          {/* Sessões Ativas */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground">Sessões Ativas</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Gerencie os dispositivos conectados à sua conta
                </p>
              </div>
              <Button variant="outline" size="sm">
                Ver Sessões
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
