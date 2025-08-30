import React from 'react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-6 w-6',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ label, size = 'md', className = '' }) => (
  <div className={`flex flex-col items-center justify-center ${className}`}>
    <div
      className={`animate-spin rounded-full border-b-2 border-primary ${sizeMap[size]} mb-2`}
    ></div>
    {label && <span className="text-tertiary text-sm">{label}</span>}
  </div>
);

export default LoadingSpinner;
