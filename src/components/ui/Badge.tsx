import React, { ReactNode } from 'react';
import { clsx } from 'clsx';
import { StandardVariant } from './StandardTypes';

interface BadgeProps {
  children: ReactNode;
  variant?: StandardVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const badgeVariants: Record<StandardVariant, string> = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  secondary: 'bg-secondary/10 text-secondary-foreground border-secondary/20',
  outline: 'bg-transparent text-foreground border-border',
  ghost: 'bg-muted/50 text-muted-foreground border-transparent',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
};

const badgeSizes = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', size = 'md', className }) => {
  return (
    <span className={clsx(
      'inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      badgeVariants[variant],
      badgeSizes[size],
      className
    )}>
      {children}
    </span>
  );
};
