import React, { forwardRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  className?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label ? (
        <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
      ) : null}
      <textarea
        ref={ref}
        {...props}
        className={`w-full px-3 py-2 border ${error ? 'border-destructive' : 'border-border'} rounded-md focus:outline-none focus:ring-2 ${error ? 'focus:ring-destructive' : 'focus:ring-ring'} focus:border-transparent bg-background text-foreground placeholder:text-muted-foreground transition ${className}`}
      />
      {error ? <p className="text-xs text-destructive mt-1">{error}</p> : null}
    </div>
  )
);
