import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
  width?: string | number;
  height?: string | number;
  animated?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rect',
  width,
  height,
  animated = true,
}) => {
  // Achado (auditoria do design system): usava as classes skeleton-root/rect/circle, definidas só em
  // components.css — arquivo que nunca foi carregado —, então o skeleton não tinha fundo nem tamanho.
  const toCss = (v?: string | number) => (typeof v === 'number' ? `${v}px` : v);
  return (
    <div
      className={cn(
        'bg-muted',
        variant === 'circle' ? 'rounded-full' : 'rounded-md',
        variant === 'text' && 'h-4',
        animated && 'animate-pulse',
        className
      )}
      style={width || height ? { width: toCss(width), height: toCss(height) } : undefined}
      aria-hidden="true"
    />
  );
};
