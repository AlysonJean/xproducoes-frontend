import React from 'react';
import { useRevealOnView } from '../../hooks/useRevealOnView';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  headerActions?: React.ReactNode;
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  title,
  description,
  headerActions,
  className = ''
}) => {
  const { ref: titleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  return (
    <div className={`min-h-screen bg-background ${className}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="text-center md:text-left">
              <h1 ref={titleRef} className="text-4xl md:text-5xl font-bold mb-4 heading-elegant leading-tight">
                {title}
              </h1>
              {description && (
                <p className="text-muted-foreground text-lg md:text-xl max-w-3xl leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            {headerActions && (
              <div className="flex-shrink-0 flex justify-center md:justify-start">
                {headerActions}
              </div>
            )}
          </div>
        </div>

        {/* Page Content */}
        <div className="space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
};

// Loading State Component
export const PageLoading: React.FC<{ message?: string }> = ({ 
  message = "Carregando..." 
}) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center max-w-md mx-auto px-6">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-border border-t-primary mx-auto mb-6"></div>
        <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
      </div>
      <p className="text-muted-foreground text-lg font-medium">{message}</p>
    </div>
  </div>
);

// Error State Component
export const PageError: React.FC<{ 
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ 
  title = "Erro ao carregar",
  message,
  onRetry
}) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center max-w-lg mx-auto px-6">
      <div className="text-destructive mb-8">
        <svg className="h-20 w-20 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">{title}</h2>
      <p className="text-muted-foreground text-lg mb-8 leading-relaxed">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry} 
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Tentar novamente
        </button>
      )}
    </div>
  </div>
);

// Empty State Component
export const PageEmpty: React.FC<{
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}> = ({
  title,
  message,
  actionLabel,
  onAction,
  icon
}) => (
  <div className="text-center py-16 px-6">
    <div className="text-muted-foreground mb-8">
      {icon || (
        <svg className="h-24 w-24 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      )}
    </div>
    <h3 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">{title}</h3>
    <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto leading-relaxed">{message}</p>
    {actionLabel && onAction && (
      <button 
        onClick={onAction}
        className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
