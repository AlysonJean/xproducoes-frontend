import { forwardRef, ReactNode } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import { StandardVariant, StandardSize } from './StandardTypes';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: StandardVariant;
  size?: StandardSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const buttonVariants: Record<StandardVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border shadow-sm',
  outline: 'border-2 border-primary text-primary hover:bg-primary/5',
  ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md',
  success: 'bg-success text-success-foreground hover:bg-success/90 shadow-md',
  warning: 'bg-warning text-warning-foreground hover:bg-warning/90 shadow-md',
};

const buttonSizes: Record<StandardSize, string> = {
  xs: 'h-8 px-3 text-xs',
  sm: 'h-10 px-4 text-sm font-medium',
  md: 'h-12 px-6 text-sm font-bold uppercase tracking-wider',
  lg: 'h-14 px-8 text-base font-bold uppercase tracking-wider',
  xl: 'h-16 px-10 text-lg font-bold uppercase tracking-widest',
  icon: 'h-10 w-10 p-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100',
          buttonVariants[variant],
          buttonSizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
        {!isLoading && leftIcon}
        <span className="truncate">{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
