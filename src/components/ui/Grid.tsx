import React, { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface GridProps {
  children: ReactNode;
  columns?: number | { sm?: number; md?: number; lg?: number; xl?: number };
  gap?: number | string;
  className?: string;
}

// Achado (auditoria do design system): as classes eram montadas em tempo de execução
// (`grid-cols-${n}`, `gap-${n}`). O Tailwind só gera o que aparece escrito por inteiro no código,
// então combinações que nenhum outro arquivo usava (ex.: xl:grid-cols-5 no mural social) não tinham
// CSS e a grade caía para 1 coluna. Mapas com as classes completas resolvem.
const COLS: Record<number, string> = {
  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6',
};
const MD_COLS: Record<number, string> = {
  1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6',
};
const LG_COLS: Record<number, string> = {
  1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6',
};
const XL_COLS: Record<number, string> = {
  1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4', 5: 'xl:grid-cols-5', 6: 'xl:grid-cols-6',
};
const GAPS: Record<number, string> = {
  0: 'gap-0', 1: 'gap-1', 2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 5: 'gap-5', 6: 'gap-6', 8: 'gap-8', 10: 'gap-10', 12: 'gap-12',
};

export const Grid: React.FC<GridProps> = ({ children, columns = 1, gap = 4, className }) => {
  // `sm` vale para todas as larguras (é a coluna base), como antes.
  const cols = typeof columns === 'number'
    ? COLS[columns]
    : cn(
        columns.sm && COLS[columns.sm],
        columns.md && MD_COLS[columns.md],
        columns.lg && LG_COLS[columns.lg],
        columns.xl && XL_COLS[columns.xl]
      );
  const gapClass = typeof gap === 'number' ? GAPS[gap] ?? 'gap-4' : gap;

  return (
    <div className={cn('grid', cols, gapClass, className)}>
      {children}
    </div>
  );
};

