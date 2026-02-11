import React, { ReactNode } from 'react';
import { clsx } from 'clsx';

interface StandardFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
}

export const Form: React.FC<StandardFormProps> = ({ children, className, ...props }) => {
  return (
    <form className={clsx('space-y-6', className)} {...props}>
      {children}
    </form>
  );
};

interface StandardFormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export const FormSection: React.FC<StandardFormSectionProps> = ({ 
  title, 
  description, 
  children, 
  className 
}) => {
  return (
    <div className={clsx('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-semibold text-foreground">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

interface StandardFormActionsProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export const FormActions: React.FC<StandardFormActionsProps> = ({ 
  children, 
  className, 
  align = 'right' 
}) => {
  return (
    <div 
      className={clsx(
        'flex gap-3 pt-4 border-t border-border',
        align === 'left' && 'justify-start',
        align === 'center' && 'justify-center',
        align === 'right' && 'justify-end',
        className
      )}
    >
      {children}
    </div>
  );
};
