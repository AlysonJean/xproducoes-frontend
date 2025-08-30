/**
 * ⏳ Sistema de Loading Avançado
 * Componentes elegantes de carregamento com diferentes variações
 */

import React, { useState, createContext, useContext } from 'react';
import type { LoadingSize, LoadingVariant, LoadingState, LoadingContextType } from '../../types/types';

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

// Provider para loading global
export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalLoading, setGlobalLoadingState] = useState<LoadingState>({
    isLoading: false,
    variant: 'spinner',
  });

  const setGlobalLoading = (state: Partial<LoadingState>) => {
    setGlobalLoadingState((prev) => ({ ...prev, ...state }));
  };

  return (
    <LoadingContext.Provider
      value={{
        globalLoading,
        setGlobalLoading,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};

// Componente Spinner
const Spinner: React.FC<{ size?: LoadingSize; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg
        className="animate-spin text-primary"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

// Componente Dots
const Dots: React.FC<{ size?: LoadingSize; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div key={i} className={`${sizeClasses[size]} bg-primary rounded-full animate-pulse`} />
      ))}
    </div>
  );
};

// Componente Skeleton
export const Skeleton: React.FC<{
  className?: string;
  width?: string;
  height?: string;
  lines?: number;
}> = ({ className = '', width = 'w-full', height = 'h-4', lines = 1 }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${width} ${height} bg-muted rounded animate-pulse`}
        />
      ))}
    </div>
  );
};

// Componente principal Loading
export const Loading: React.FC<{
  isLoading?: boolean;
  variant?: LoadingVariant;
  size?: LoadingSize;
  message?: string;
  className?: string;
  overlay?: boolean;
}> = ({
  isLoading = true,
  variant = 'spinner',
  size = 'md',
  message,
  className = '',
  overlay = false,
}) => {
  if (!isLoading) return null;

  const renderLoadingComponent = () => {
    switch (variant) {
      case 'spinner':
        return <Spinner size={size} />;
      case 'dots':
        return <Dots size={size} />;
      case 'bars':
        return <Spinner size={size} />; // Fallback
      default:
        return <Spinner size={size} />;
    }
  };

  const content = (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {renderLoadingComponent()}
      {message && <p className="text-sm text-muted-foreground text-center">{message}</p>}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-lg p-6 shadow-xl">{content}</div>
      </div>
    );
  }

  return content;
};

// Componente Global Loading Overlay
export const GlobalLoadingOverlay: React.FC = () => {
  const { globalLoading } = useLoading();

  if (!globalLoading.isLoading) return null;

  return (
    <Loading isLoading={globalLoading.isLoading} variant={globalLoading.variant} overlay={true} />
  );
};
