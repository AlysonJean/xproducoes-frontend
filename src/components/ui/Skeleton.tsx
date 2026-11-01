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

export const CardSkeleton = () => (
  <div className="bg-card rounded-2xl overflow-hidden border border-border/50">
    <Skeleton className="aspect-[16/10] w-full rounded-none" />
    <div className="p-5 space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  </div>
);

export const ListSkeleton = ({ cards = 8 }: { cards?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
    {Array.from({ length: cards }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);
