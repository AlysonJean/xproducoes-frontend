// src/utils/sentry.ts
import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const SENTRY_ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development';

export const initSentry = () => {
  if (!SENTRY_DSN) {
    // Sentry is optional. Return a safe no-op API so callers don't need to null-check.
    const noop = () => undefined as any;
    return {
      setUserContext: noop,
      ErrorBoundary: ({ children }: any) => children,
      captureException: noop,
      captureMessage: noop,
      addBreadcrumb: noop,
    };
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    integrations: [
      // BrowserTracing is not available in @sentry/react, using basic integration
    ],

    // Performance Monitoring
    tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,

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
        }
      }

      return event;
    },

    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
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
    } else {
      Sentry.setUser(null);
    }
  };

  // Error boundary for React components
  const ErrorBoundary = Sentry.ErrorBoundary;

  return {
    setUserContext,
    ErrorBoundary,
    captureException: Sentry.captureException,
    captureMessage: Sentry.captureMessage,
    addBreadcrumb: Sentry.addBreadcrumb,
  };
};

export default Sentry;