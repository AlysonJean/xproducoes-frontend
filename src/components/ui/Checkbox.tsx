import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  /** Texto de apoio abaixo do rótulo (ligado ao campo via aria-describedby) */
  description?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, className, id, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id || props.name || generatedId;

    return (
      <div className="flex items-start space-x-2">
        <input
          type="checkbox"
          ref={ref}
          id={checkboxId}
          // `text-primary` não colore checkbox nativo (sem plugin de forms) — saía no azul do navegador.
          // accent-color pinta com a marca; erro ligado ao campo para leitor de tela.
          className={cn(
            "peer h-4 w-4 rounded accent-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={[description && `${checkboxId}-description`, error && `${checkboxId}-error`].filter(Boolean).join(' ') || undefined}
          {...props}
        />
        <div className="grid gap-1.5 leading-none">
          {label && (
            <label
              htmlFor={checkboxId}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && <p id={`${checkboxId}-description`} className="text-sm text-muted-foreground">{description}</p>}
          {error && <p id={`${checkboxId}-error`} className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';
