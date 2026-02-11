import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, description, error, success, resize = 'vertical', className, id, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || props.name || generatedId;
    const hasError = !!error;
    const hasSuccess = !!success;

    return (
      <div className="space-y-2 w-full">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-foreground block">
            {label}
          </label>
        )}
        
        <textarea
          ref={ref}
          id={textareaId}
          className={clsx(
            'w-full min-h-[80px] rounded-lg border-2 bg-card px-3 py-2 text-foreground transition-all duration-200',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'hover:border-primary/50',
            hasError && 'border-destructive focus:ring-destructive focus:border-destructive',
            hasSuccess && 'border-success focus:ring-success focus:border-success',
            !hasError && !hasSuccess && 'border-border',
            resize === 'none' && 'resize-none',
            resize === 'vertical' && 'resize-y',
            resize === 'horizontal' && 'resize-x',
            resize === 'both' && 'resize',
            className
          )}
          aria-describedby={(() => {
            const v = [
              description ? `${textareaId}-description` : null,
              error ? `${textareaId}-error` : null,
              success ? `${textareaId}-success` : null,
            ].filter(Boolean).join(' ');
            return v || undefined;
          })()}
          {...(hasError ? { 'aria-invalid': 'true' as const } : {})}
          {...props}
        />
        
        {description && (
          <p id={`${textareaId}-description`} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
        
        {error && (
          <p id={`${textareaId}-error`} className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
        
        {success && (
          <p id={`${textareaId}-success`} className="text-sm text-success flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {success}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
