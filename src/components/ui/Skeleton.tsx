import React, { useRef, useLayoutEffect } from 'react';

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
  const variantClass = variant === 'circle' ? 'skeleton-circle' : 'skeleton-rect';
  const animationClass = animated ? 'animate-pulse' : '';
  const skRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (skRef.current) {
      if (width) {
        skRef.current.style.setProperty('--sk-w', typeof width === 'number' ? `${width}px` : width.toString());
      }
      if (height) {
        skRef.current.style.setProperty('--sk-h', typeof height === 'number' ? `${height}px` : height.toString());
      }
    }
  }, [width, height]);

  return (
    <div
      ref={skRef}
      className={`skeleton-root ${variantClass} ${animationClass} ${className}`}
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
