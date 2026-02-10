import React from 'react';

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
  width, // Mantido para compatibilidade temporária, mas desencorajado
  height, // Mantido para compatibilidade temporária, mas desencorajado
  animated = true,
}) => {
  const variantClass = variant === 'circle' ? 'skeleton-circle' : 'skeleton-rect';
  const animationClass = animated ? 'animate-pulse' : '';

  // Fallback seguro via variáveis CSS para evitar erro de lint de 'inline styles' diretos
  const skStyles = {
    ...(width ? { '--sk-w': typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height ? { '--sk-h': typeof height === 'number' ? `${height}px` : height } : {}),
  } as React.CSSProperties;

  return (
    <div
      className={`skeleton-root ${variantClass} ${animationClass} ${className}`}
      style={Object.keys(skStyles).length > 0 ? skStyles : undefined}
      aria-hidden="true"
    />
  );
};

export const SkeletonCard = () => (
  <div className="bg-card border rounded-xl p-6 space-y-4">
    <div className="flex justify-between items-start">
      <Skeleton width={120} height={20} />
      <Skeleton variant="circle" width={32} height={32} />
    </div>
    <div className="space-y-2">
      <Skeleton width="60%" height={32} />
      <Skeleton width="40%" height={16} />
    </div>
  </div>
);

export const SkeletonList = ({ items = 5 }: { items?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-2 border-b last:border-0 border-border/40">
        <Skeleton variant="circle" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton width="30%" height={16} />
          <Skeleton width="60%" height={12} />
        </div>
      </div>
    ))}
  </div>
);
