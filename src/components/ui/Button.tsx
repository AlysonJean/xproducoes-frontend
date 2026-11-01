import { forwardRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { StandardVariant, StandardSize } from './StandardTypes';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: StandardVariant;
  size?: StandardSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<StandardVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border shadow-sm',
  outline: 'border-2 border-primary text-primary hover:bg-primary/5',
  ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md',
  success: 'bg-success text-success-foreground hover:bg-success/90 shadow-md',
  warning: 'bg-warning text-warning-foreground hover:bg-warning/90 shadow-md',
  info: 'bg-info text-info-foreground hover:bg-info/90 shadow-md',
};

const sizeClasses: Record<StandardSize, string> = {
  xs: 'h-8 px-3 text-xs',
  sm: 'h-10 px-4 text-sm font-medium',
  md: 'h-12 px-6 text-sm font-bold uppercase tracking-wider',
  lg: 'h-14 px-8 text-base font-bold uppercase tracking-wider',
  xl: 'h-16 px-10 text-lg font-bold uppercase tracking-widest',
  icon: 'h-10 w-10 p-2',
};

// Achado (auditoria do design system): o botão não tinha estilo de foco — quem navega por teclado
// não via onde estava. Anel no token --ring (marca no claro, laranja no escuro), só no foco por
// teclado (focus-visible), igual em todos os controles.
const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-300 active:scale-95 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
  'disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

/**
 * Classes do Button para elementos que não são <button> — ex.: `<Link className={buttonVariants({ variant: 'outline' })}>`.
 * Achado: sem isto (o Button não tem `asChild`), cada tela copiava o estilo do botão à mão em
 * links (CTAs das páginas de detalhe, erro, sucesso…), cada uma com raio/altura/caixa diferente.
 */
// Exportado junto do componente de propósito (mesmo estilo, mesma fonte) — a regra do Fast Refresh só
// afeta a granularidade do recarregamento em dev, sem efeito em produção.
// eslint-disable-next-line react-refresh/only-export-components
export function buttonVariants({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: { variant?: StandardVariant; size?: StandardSize; fullWidth?: boolean; className?: string } = {}) {
  // cn = clsx + tailwind-merge: o className de quem chama vence o padrão (ex.: h-8 num size="sm").
  return cn(baseClasses, variantClasses[variant], sizeClasses[size], fullWidth && 'w-full', className);
}

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
        className={buttonVariants({ variant, size, fullWidth, className })}
        {...props}
      >
        {isLoading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
        {!isLoading && leftIcon}
        {/* Achado (revisão da auditoria, medido em produção): ícone passado como filho (`<Download /> Exportar`)
            ficava EM CIMA do texto — o preflight do Tailwind v4 deixa todo <svg> como display:block, e o
            span é um bloco (item de flex). Ícones dentro do texto voltam a ser inline, alinhados ao meio. */}
        <span className="truncate [&>svg]:inline-block [&>svg]:align-middle [&>svg]:mx-0.5">{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
