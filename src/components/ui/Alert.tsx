import React, { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { StandardStatus } from './StandardTypes';

interface AlertProps {
  variant?: StandardStatus;
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  onClose?: () => void;
  action?: ReactNode;
}

// Achado (auditoria do design system): o texto usava `text-{status}-foreground` — a cor feita para ir
// SOBRE o fundo sólido do status (branco no claro, quase preto no escuro) — em cima de um fundo a 10%:
// texto branco em fundo quase branco. Atingia todo Alert (32 telas) e a mensagem de todo ConfirmModal.
// Agora o texto é o do tema; o status aparece no ícone, na borda e no fundo suave.
const alertVariants: Record<StandardStatus, { container: string; icon: ReactNode }> = {
  default: {
    container: 'border-border bg-background text-foreground',
    icon: <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
  },
  info: {
    container: 'border-info/50 bg-info/10 text-foreground',
    icon: <Info className="h-4 w-4 text-info" aria-hidden="true" />
  },
  success: {
    container: 'border-success/50 bg-success/10 text-foreground',
    icon: <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
  },
  warning: {
    container: 'border-warning/50 bg-warning/10 text-foreground',
    icon: <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
  },
  error: {
    container: 'border-destructive/50 bg-destructive/10 text-foreground',
    icon: <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
  },
};

export const Alert: React.FC<AlertProps> = ({ 
  variant = 'default', 
  title, 
  description, 
  children, 
  className, 
  onClose,
  action
}) => {
  const alertConfig = alertVariants[variant];

  return (
    <div
      className={cn(
        'relative w-full rounded-lg border p-4',
        alertConfig.container,
        className
      )}
      // Erro e aviso interrompem o leitor de tela; informativo e sucesso não (um texto estático
      // com role="alert" era anunciado de forma assertiva ao carregar a página).
      role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {alertConfig.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          {title && (
            <p className="mb-1 font-display font-medium leading-none tracking-tight">
              {title}
            </p>
          )}
          
          {description && (
            <div className="text-sm opacity-90">
              {description}
            </div>
          )}
          
          {children}
        </div>
        
        {action && (
          <div className="flex-shrink-0 flex items-center">
            {action}
          </div>
        )}
        
        {onClose && (
          <button
            onClick={onClose}
            type="button"
            className="flex-shrink-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fechar alerta"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
