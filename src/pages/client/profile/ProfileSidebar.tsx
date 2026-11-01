import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Card, buttonVariants } from '../../../components/ui/StandardComponents';

// Achados (auditoria do design system):
// - "Atividade Recente" e "Conquistas" eram fixas no código ("Perfil atualizado — Há 2 horas",
//   "Cliente Premium — 5+ reservas") e apareciam iguais para todo cliente: removidas (sem dado real,
//   não há card).
// - "Desativar Conta" e "Excluir Conta" não tinham ação. A desativação não existe no backend e saiu;
//   a exclusão real (LGPD, POST /users/me/request-deletion) já existe na página /lgpd — o link leva lá.
export const ProfileSidebar: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card padding>
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-destructive" aria-hidden="true" />
          <h2 className="font-semibold text-foreground">Privacidade e conta</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Baixe uma cópia dos seus dados ou solicite a exclusão da sua conta (LGPD).
        </p>
        <Link
          to="/lgpd"
          className={buttonVariants({
            variant: 'outline',
            size: 'sm',
            fullWidth: true,
            className: 'border-destructive text-destructive hover:bg-destructive/10',
          })}
        >
          Meus dados e exclusão da conta
        </Link>
      </Card>
    </div>
  );
};
