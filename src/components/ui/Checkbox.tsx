import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id || props.name || generatedId;

    return (
      <div className="flex items-start space-x-2">
        <input
          type="checkbox"
          ref={ref}
          id={checkboxId}
          className={clsx(
            "h-4 w-4 rounded border-border text-primary ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
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
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';
