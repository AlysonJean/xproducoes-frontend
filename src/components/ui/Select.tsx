import React, { forwardRef } from 'react';

type NativeSelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>;

interface SelectProps extends NativeSelectProps {
  label?: string;
  error?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<NonNullable<SelectProps['size']>, string> = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-2.5 text-base',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = '', size = 'md', children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label ? (
          <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
        ) : null}
        <select
          ref={ref}
          {...props}
          className={`w-full border ${error ? 'border-destructive' : 'border-border'} bg-background text-foreground rounded-md focus:outline-none focus:ring-2 ${error ? 'focus:ring-destructive' : 'focus:ring-ring'} focus:border-transparent transition ${sizeClasses[size]} ${className}`}
        >
          {children}
        </select>
        {error ? <p className="text-xs text-destructive mt-1">{error}</p> : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
