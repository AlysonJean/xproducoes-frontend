import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/Button';
import { ErrorHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    ErrorHandler.handle(error, 'React Error Boundary');
    
    logger.error('React Error Boundary caught an error', 'ErrorBoundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorId: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-8">
          <div className="max-w-md text-center space-y-6">
            <div className="text-6xl">🚨</div>
            
            <h1 className="text-2xl font-bold text-foreground">
              Ops! Algo deu errado
            </h1>
            
            <p className="text-muted-foreground">
              Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada automaticamente.
            </p>

            {this.state.errorId && (
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">ID do Erro:</p>
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                  {this.state.errorId}
                </code>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleRetry}
                variant="primary"
              >
                Tentar Novamente
              </Button>
              <Button
                onClick={this.handleReload}
                variant="secondary"
              >
                Recarregar Página
              </Button>
            </div>

            {import.meta.env.MODE === 'development' && this.state.error && (
              <details className="text-left bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <summary className="cursor-pointer text-destructive font-medium mb-2">
                  Detalhes do Erro (Dev Mode)
                </summary>
                <pre className="text-xs overflow-auto text-destructive">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
