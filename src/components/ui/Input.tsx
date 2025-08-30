import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = '', ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label ? (
      <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
    ) : null}
    <input
      ref={ref}
      {...props}
      className={`w-full px-4 py-2 border ${error ? 'border-destructive' : 'border-border'} bg-background text-foreground rounded-md focus:outline-none focus:ring-2 ${error ? 'focus:ring-destructive' : 'focus:ring-ring'} focus:border-transparent placeholder:text-muted-foreground transition ${className}`}
    />
    {error ? <p className="text-xs text-destructive mt-1">{error}</p> : null}
  </div>
));
