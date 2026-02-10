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
  width,
  height,
  animated = true,
}) => {
  const baseClasses = 'bg-muted/40';
  const animationClass = animated ? 'animate-pulse' : '';
  const variantClass = variant === 'circle' ? 'rounded-full' : 'rounded-md';

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`${baseClasses} ${animationClass} ${variantClass} ${className}`}
      style={style}
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
