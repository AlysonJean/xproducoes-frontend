import React from 'react';
import { RefreshCw } from 'lucide-react';
import { BrandLoader } from '../ui/BrandLoader';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

/**
 * Estados padrão das páginas do portal do colaborador.
 * Achado (auditoria do design system): o carregamento aparecia de 4 jeitos (BrandLoader gigante com
 * texto de 10px, BrandLoader 120px, "Carregando..." solto, nenhum) e nenhuma página mostrava erro —
 * falha de API virava métricas zeradas ou "nenhum item", como se fossem dados reais.
 */
export const CollaboratorLoading: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <BrandLoader size="md" label={label} />
  </div>
);

interface CollaboratorErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const CollaboratorError: React.FC<CollaboratorErrorProps> = ({
  title = 'Não foi possível carregar',
  message,
  onRetry,
  className,
}) => (
  <Alert
    variant="error"
    title={title}
    description={message}
    className={className}
    action={
      onRetry ? (
        <Button size="sm" variant="outline" onClick={onRetry} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Tentar de novo
        </Button>
      ) : undefined
    }
  />
);
