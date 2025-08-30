import React from 'react';
import { LoadingSpinnerProps } from '../../types/types';

const sizeMap = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ className = '', label, size = 'md' }) => (
  <div className={`flex flex-col items-center justify-center ${className}`}>
    <div className={`animate-spin rounded-full border-b-2 border-primary ${sizeMap[size as keyof typeof sizeMap]}`}></div>
    {label && <span className="mt-2 text-muted-foreground text-sm text-center">{label}</span>}
  </div>
);
export default LoadingSpinner;
