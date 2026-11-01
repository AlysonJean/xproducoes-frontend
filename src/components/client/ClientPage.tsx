import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Alert, BrandLoader, Button } from '../ui/StandardComponents';

// Estrutura comum das páginas da área do cliente (painel, reservas, agenda, perfil, favoritos,
// carrinho, orçamento). Achado (auditoria do design system): cada página tinha o seu container —
// algumas sem padding nenhum (conteúdo encostado nas bordas a 375px), larguras 4xl/6xl/7xl sem
// critério — e o seu estado de carregamento/erro (texto solto, skeleton à mão, BrandLoader em tela
// cheia cobrindo o header, div vermelha sem "tentar de novo").

const widths = {
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
} as const;

interface ClientPageProps {
  /** Único <h1> da página. Sem título, a página renderiza o próprio cabeçalho. */
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Ícone opcional ao lado do título (lucide h-6 w-6). */
  icon?: React.ReactNode;
  /** Ações do cabeçalho (botões/links). Quebram para baixo do título no celular. */
  actions?: React.ReactNode;
  width?: keyof typeof widths;
  className?: string;
  children?: React.ReactNode;
}

export const ClientPage: React.FC<ClientPageProps> = ({
  title,
  description,
  icon,
  actions,
  width = '7xl',
  className = '',
  children,
}) => (
  <div className={`mx-auto w-full ${widths[width]} px-4 py-8 sm:px-6 lg:px-8 ${className}`}>
    {(title || actions) && (
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {title && (
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                aria-hidden="true"
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
              {description && <p className="mt-1 text-muted-foreground">{description}</p>}
            </div>
          </div>
        )}
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    )}
    {children}
  </div>
);

/** Carregamento de página/seção: BrandLoader inline (abaixo do header), com rótulo anunciado. */
export const ClientPageLoading: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex min-h-[40vh] items-center justify-center py-12">
    <BrandLoader size="md" label={label} />
  </div>
);

/** Erro de carregamento com "Tentar de novo" — nunca mostrar erro de API como lista vazia. */
export const ClientPageError: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <Alert
    variant="error"
    title="Não foi possível carregar"
    action={
      onRetry && (
        <Button size="sm" variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={onRetry}>
          Tentar de novo
        </Button>
      )
    }
  >
    <p className="text-sm">{message}</p>
  </Alert>
);

export default ClientPage;
