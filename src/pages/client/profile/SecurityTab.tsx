import React from 'react';
import { Lock } from 'lucide-react';
import { Card, Input, Button, Form } from '../../../components/ui/StandardComponents';
import { PASSWORD_HINT } from '../../../components/layouts/AuthLayout';
import { ProfilePasswordForm } from '../../../types/types';

interface SecurityTabProps {
  passwordForm: ProfilePasswordForm;
  setPasswordForm: (form: ProfilePasswordForm) => void;
  saving: boolean;
  handleChangePassword: () => void;
}

// Achado (auditoria do design system): "Autenticação de Dois Fatores → Configurar" e "Sessões Ativas →
// Ver Sessões" eram botões sem ação (não existe 2FA nem gestão de sessões no backend) — removidos.
export const SecurityTab: React.FC<SecurityTabProps> = ({
  passwordForm,
  setPasswordForm,
  saving,
  handleChangePassword
}) => {
  const confirmMismatch =
    passwordForm.confirmPassword.length > 0 && passwordForm.confirmPassword !== passwordForm.newPassword;

  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">Segurança da Conta</h3>

        {/* Alterar Senha — num <form>: Enter envia e o gerenciador de senhas reconhece os campos. */}
        <div className="border border-border rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-4">Alterar Senha</h4>

          <Form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleChangePassword();
            }}
          >
            <Input
              label="Senha atual"
              type="password"
              showPasswordToggle
              leftIcon={<Lock className="h-4 w-4" />}
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              autoComplete="current-password"
            />

            <Input
              label="Nova senha"
              type="password"
              showPasswordToggle
              leftIcon={<Lock className="h-4 w-4" />}
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              placeholder="Crie uma senha"
              description={PASSWORD_HINT}
              autoComplete="new-password"
            />

            <Input
              label="Confirmar nova senha"
              type="password"
              showPasswordToggle
              leftIcon={<Lock className="h-4 w-4" />}
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              placeholder="Digite a nova senha novamente"
              error={confirmMismatch ? 'As senhas não coincidem' : undefined}
              autoComplete="new-password"
            />

            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
            >
              Alterar Senha
            </Button>
          </Form>
        </div>
      </div>
    </Card>
  );
};
