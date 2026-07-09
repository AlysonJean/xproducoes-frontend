import React, { forwardRef, ReactNode, useState } from 'react';
import { clsx } from 'clsx';
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { StandardSize } from './StandardTypes';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  description?: string;
  helperText?: string;
  error?: string;
  success?: string;
  size?: StandardSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isLoading?: boolean;
  showPasswordToggle?: boolean;
}

const inputSizes: Record<StandardSize, string> = {
  xs: 'h-8 px-2 text-xs',
  sm: 'h-10 px-3 text-sm',
  md: 'h-12 px-4 text-sm font-medium',
  lg: 'h-14 px-5 text-base font-medium',
  xl: 'h-16 px-6 text-lg font-medium',
  icon: 'h-10 w-10 px-2 text-sm',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    description, 
    helperText,
    error, 
    success, 
    size = 'md', 
    leftIcon, 
    rightIcon, 
    isLoading, 
    showPasswordToggle,
    className, 
    type = 'text',
    id,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const generatedId = React.useId();
    const inputId = id || props.name || generatedId;
    const hasError = !!error;
    const hasSuccess = !!success;
    
    const inputType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="space-y-2 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground block">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={clsx(
              'w-full rounded-lg border-2 bg-card text-foreground transition-all duration-200',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'hover:border-primary/50',
              inputSizes[size],
              leftIcon && 'pl-10',
              (rightIcon || showPasswordToggle || isLoading) && 'pr-10',
              hasError && 'border-destructive focus:ring-destructive focus:border-destructive',
              hasSuccess && 'border-success focus:ring-success focus:border-success',
              !hasError && !hasSuccess && 'border-border',
              className
            )}
            aria-describedby={(() => {
              const v = [
                description ? `${inputId}-description` : null,
                helperText ? `${inputId}-helper` : null,
                error ? `${inputId}-error` : null,
                success ? `${inputId}-success` : null,
              ].filter(Boolean).join(' ');
              return v || undefined;
            })()}
            {...(hasError ? { 'aria-invalid': 'true' as const } : {})}
            {...props}
          />
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {showPasswordToggle && !isLoading && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
            {rightIcon && !isLoading && !showPasswordToggle && rightIcon}
          </div>
        </div>
        
        {description && (
          <p id={`${inputId}-description`} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}

        {helperText && !error && !success && (
          <p id={`${inputId}-helper`} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
        
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
        
        {success && (
          <p id={`${inputId}-success`} className="text-sm text-success flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
