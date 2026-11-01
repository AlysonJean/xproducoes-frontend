import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../ui/StandardComponents';

// Esqueleto único das telas de autenticação (login, cadastro, esqueci/redefinir senha, verificar
// e-mail, completar perfil/cadastro, convite, retorno do OAuth). Achado (auditoria do design system):
// eram 5 esqueletos diferentes em 8 telas — card centralizado, PageLayout com breadcrumbs e h1 gigante,
// título fora do card, `bg-white` cru —, com ícone em 3 estilos, h1/h2 alternando e larguras
// `max-w-md`/`max-w-lg`. Fica dentro do Layout do app (Header/Footer), por isso sem `min-h-screen`.

/** Regra de senha forte (strongPasswordSchema) dita igual em todas as telas que criam/trocam senha. */
export const PASSWORD_HINT = 'Mínimo de 8 caracteres, com letra maiúscula, letra minúscula e número.';

const iconTones = {
  primary: 'bg-primary/10 text-primary',
  destructive: 'bg-destructive/10 text-destructive',
  success: 'bg-success/10 text-success',
} as const;

interface AuthLayoutProps {
  /** Ícone lucide (h-6 w-6) exibido no topo do card. */
  icon: React.ReactNode;
  /** Único <h1> da tela. */
  title: string;
  subtitle?: React.ReactNode;
  iconTone?: keyof typeof iconTones;
  /** Rodapé do card (links "Já tem conta?", termos…), separado por uma linha. */
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  icon,
  title,
  subtitle,
  iconTone = 'primary',
  footer,
  children,
}) => (
  <div className="flex min-h-[70vh] items-center justify-center px-4 py-10 sm:py-16">
    <Card className="w-full max-w-md space-y-6 p-6 shadow-xl sm:p-8">
      <div className="text-center">
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${iconTones[iconTone]}`}
          aria-hidden="true"
        >
          {icon}
        </div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      {children}

      {footer && (
        <div className="space-y-3 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </Card>
  </div>
);

/** Link "Voltar ao login" usado no rodapé das telas de senha/convite. */
export const BackToLoginLink: React.FC = () => (
  <Link
    to="/login"
    className="inline-flex items-center gap-2 font-medium text-primary transition-colors hover:text-primary/80"
  >
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    Voltar ao login
  </Link>
);

export default AuthLayout;
