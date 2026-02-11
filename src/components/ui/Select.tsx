import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { StandardSize } from './StandardTypes';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  size?: StandardSize;
  options?: SelectOption[];
  placeholder?: string;
}

const inputSizes: Record<StandardSize, string> = {
  xs: 'h-8 px-2 text-xs',
  sm: 'h-10 px-3 text-sm',
  md: 'h-12 px-4 text-sm font-medium',
  lg: 'h-14 px-5 text-base font-medium',
  xl: 'h-16 px-6 text-lg font-medium',
  icon: 'h-10 w-10 px-2 text-sm',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, description, error, success, size = 'md', options, placeholder, className, id, children, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || props.name || generatedId;
    const hasError = !!error;
    const hasSuccess = !!success;

    return (
      <div className="space-y-2 w-full">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-foreground block">
            {label}
          </label>
        )}
        
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            'w-full rounded-lg border-2 bg-card text-foreground transition-all duration-200 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'hover:border-primary/50',
            inputSizes[size],
            hasError && 'border-destructive focus:ring-destructive focus:border-destructive',
            hasSuccess && 'border-success focus:ring-success focus:border-success',
            !hasError && !hasSuccess && 'border-border',
            className
          )}
          aria-describedby={(() => {
            const v = [
              description ? `${selectId}-description` : null,
              error ? `${selectId}-error` : null,
              success ? `${selectId}-success` : null,
            ].filter(Boolean).join(' ');
            return v || undefined;
          })()}
          {...(hasError ? { 'aria-invalid': 'true' as const } : {})}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options ? options.map(option => (
            <option key={option.value} value={option.value} disabled={option.disabled} className="bg-card text-foreground">
              {option.label}
            </option>
          )) : children}
        </select>
        
        {description && (
          <p id={`${selectId}-description`} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
        
        {error && (
          <p id={`${selectId}-error`} className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
        
        {success && (
          <p id={`${selectId}-success`} className="text-sm text-success flex items-center gap-1">
            <CheckCircle2 className="h-3 w-4" />
            {success}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
