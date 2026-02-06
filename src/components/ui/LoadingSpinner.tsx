import React from 'react';
import { LoadingSpinnerProps } from '@/types/ui';

const sizeMap = {
  sm: { spinner: 'h-8 w-8', border: 'border-2' },
  md: { spinner: 'h-12 w-12', border: 'border-3' },
  lg: { spinner: 'h-16 w-16', border: 'border-4' },
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  className = '', 
  label, 
  size = 'md' 
}) => {
  const { spinner, border } = sizeMap[size as keyof typeof sizeMap] || sizeMap.md;
  
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative">
        {/* Spinner animado com borda dupla (igual ao PageLoading) */}
        <div className={`animate-spin rounded-full ${spinner} ${border} border-border border-t-primary`}></div>
        {/* Círculo de fundo com opacidade */}
        <div className={`absolute inset-0 rounded-full ${border} border-primary/20`}></div>
      </div>
      {label && (
        <span className="mt-4 text-muted-foreground text-sm font-medium text-center">
          {label}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;
