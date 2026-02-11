import React, { ReactNode } from 'react';
import { clsx } from 'clsx';
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

const alertVariants: Record<StandardStatus, { container: string; icon: ReactNode }> = {
  default: { 
    container: 'border-border bg-background text-foreground', 
    icon: <Info className="h-4 w-4" /> 
  },
  info: { 
    container: 'border-info/50 bg-info/10 text-info-foreground', 
    icon: <Info className="h-4 w-4" /> 
  },
  success: { 
    container: 'border-success/50 bg-success/10 text-success-foreground', 
    icon: <CheckCircle2 className="h-4 w-4" /> 
  },
  warning: { 
    container: 'border-warning/50 bg-warning/10 text-warning-foreground', 
    icon: <AlertTriangle className="h-4 w-4" /> 
  },
  error: { 
    container: 'border-destructive/50 bg-destructive/10 text-destructive-foreground', 
    icon: <AlertCircle className="h-4 w-4" /> 
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
      className={clsx(
        'relative w-full rounded-lg border p-4',
        alertConfig.container,
        className
      )}
      role="alert"
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {alertConfig.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          {title && (
            <h5 className="mb-1 font-medium leading-none tracking-tight">
              {title}
            </h5>
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
            className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Fechar alerta"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
