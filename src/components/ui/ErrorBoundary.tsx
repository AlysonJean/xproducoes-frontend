import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  location?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // data = error (não um wrapper) para preservar Sentry.captureException com stack trace real
    // (logger.error só encaminha exceção real para o Sentry quando data instanceof Error).
    logger.error(
      `ErrorBoundary caught an error in ${this.props.location || 'component'}: ${errorInfo.componentStack}`,
      'ErrorBoundary',
      error
    );
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-4 m-2 bg-destructive/10 border border-destructive rounded text-destructive text-sm">
          <p className="font-bold">Algo correu mal.</p>
          <p className="text-xs mt-1 opacity-80">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
