import React, { ReactNode } from 'react';
import { clsx } from 'clsx';

export type StandardVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning';
export type StandardSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type StandardStatus = 'default' | 'error' | 'success' | 'warning' | 'info';

interface GridProps {
  children: ReactNode;
  columns?: number | { sm?: number; md?: number; lg?: number; xl?: number };
  gap?: number | string;
  className?: string;
}

export const Grid: React.FC<GridProps> = ({ children, columns = 1, gap = 4, className }) => {
  const getGridCols = () => {
    if (typeof columns === 'number') return `grid-cols-${columns}`;
    
    return clsx(
      columns.sm && `grid-cols-${columns.sm}`,
      columns.md && `md:grid-cols-${columns.md}`,
      columns.lg && `lg:grid-cols-${columns.lg}`,
      columns.xl && `xl:grid-cols-${columns.xl}`
    );
  };

  const getGap = () => {
    if (typeof gap === 'number') return `gap-${gap}`;
    return gap;
  };

  return (
    <div className={clsx('grid', getGridCols(), getGap(), className)}>
      {children}
    </div>
  );
};
