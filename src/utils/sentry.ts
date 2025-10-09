// src/utils/sentry.ts
import * as Sentry from '@sentry/react';
import { SentryErrorFallback } from '@/components/SentryErrorFallback';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const SENTRY_ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development';

export const initSentry = () => {
  if (!SENTRY_DSN) {
    console.warn('⚠️ Sentry DSN não configurado. Monitoramento de erros desativado.');
    // Sentry is optional. Return a safe no-op API so callers don't need to null-check.
    const noop = () => undefined as any;
    return {
      setUserContext: noop,
      ErrorBoundary: ({ children }: any) => children,
      ErrorFallback: SentryErrorFallback,
      captureException: noop,
      captureMessage: noop,
      addBreadcrumb: noop,
      setTag: noop,
      setContext: noop,
    };
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    
    // Performance Monitoring
    tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Send default PII (IP addresses, user info, etc.)
    sendDefaultPii: true,

    // Error filtering
    beforeSend(event, hint) {
      // Filter out network errors that are expected
      if (event.exception) {
        const error = hint.originalException;
        if (error && typeof error === 'object' && 'message' in error) {
          const message = String(error.message).toLowerCase();

          // Filter out common network errors
          if (
            message.includes('network error') ||
            message.includes('failed to fetch') ||
            message.includes('load chunk') ||
            message.includes('loading chunk') ||
            message.includes('chunkloaderror')
          ) {
            // Still capture but with lower priority
            event.level = 'warning';
          }

          // Filter out ResizeObserver errors (common false positive)
          if (message.includes('resizeobserver')) {
            return null; // Don't send to Sentry
          }
        }
      }

      // Don't send errors in development (but log them)
      if (SENTRY_ENVIRONMENT === 'development') {
        console.log('🐛 Sentry Event (Dev Mode):', event);
        return null;
      }

      return event;
    },

    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy console logs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
        return null;
      }
      return breadcrumb;
    },

    // Release tracking
    release: `xproducoes-frontend@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,

    // Additional metadata
    initialScope: {
      tags: {
        'app.name': 'X-Produções Frontend',
        'app.framework': 'React',
        'app.version': import.meta.env.VITE_APP_VERSION || '1.0.0',
      },
    },
  });

  // Log initialization
  console.log('✅ Sentry inicializado:', {
    environment: SENTRY_ENVIRONMENT,
    dsn: SENTRY_DSN.substring(0, 20) + '...',
    release: `xproducoes-frontend@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
  });

  // Set user context if available
  const setUserContext = (user: any) => {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
        role: user.role,
      });
      Sentry.setTag('user_role', user.role);
      console.log('👤 Sentry: Contexto de usuário definido:', user.email);
    } else {
      Sentry.setUser(null);
      console.log('👤 Sentry: Contexto de usuário removido');
    }
  };

  // Error boundary for React components
  const ErrorBoundary = Sentry.ErrorBoundary;

  return {
    setUserContext,
    ErrorBoundary,
    ErrorFallback: SentryErrorFallback,
    captureException: Sentry.captureException,
    captureMessage: Sentry.captureMessage,
    addBreadcrumb: Sentry.addBreadcrumb,
    setTag: Sentry.setTag,
    setContext: Sentry.setContext,
  };
};

export default Sentry;