import React, { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { StandardVariant } from './StandardTypes';

interface BadgeProps {
  children: ReactNode;
  variant?: StandardVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const badgeVariants: Record<StandardVariant, string> = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  // Achado: era `bg-secondary/10 text-secondary-foreground` — texto branco sobre verde a 10% no tema
  // claro (invisível). Sólido funciona nos dois temas (verde/branco no claro, grafite/prata no escuro).
  // Para um selo NEUTRO use `ghost` ou `outline`, não `secondary`.
  secondary: 'bg-secondary text-secondary-foreground border-transparent',
  outline: 'bg-transparent text-foreground border-border',
  ghost: 'bg-muted text-muted-foreground border-transparent',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  info: 'bg-info/10 text-info border-info/20',
};

// Texto de selo nunca abaixo de 12px (antes, sm = 10px).
const badgeSizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', size = 'md', className }) => {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border font-semibold transition-colors',
      badgeVariants[variant],
      badgeSizes[size],
      className
    )}>
      {children}
    </span>
  );
};
