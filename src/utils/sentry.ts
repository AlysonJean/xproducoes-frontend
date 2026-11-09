
// src/utils/sentry.ts
// Achado: `import * as Sentry` impede o tree-shaking de sub-módulos não usados do SDK
// (Replay, Profiling) — o bundler não pode eliminar nada de um namespace object
// importado por completo. Imports nomeados, um por símbolo realmente usado abaixo.
import {
  init,
  setTag,
  setContext,
  ErrorBoundary,
  captureException,
  captureMessage,
  addBreadcrumb,
} from '@sentry/react';
import { SentryErrorFallback } from '@/components/SentryErrorFallback';
import { logger } from './logger';
import { stripSensitiveParams } from './sensitiveParams';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const SENTRY_ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development';

// Campos em que o SDK grava URLs nos breadcrumbs: navegação (from/to) e requisições fetch/xhr (url).
const BREADCRUMB_URL_FIELDS = ['url', 'from', 'to'];

export const initSentry = () => {
  if (!SENTRY_DSN) {
    logger.warn('⚠️ Sentry DSN não configurado. Monitoramento de erros desativado.', 'sentry');
    // Sentry is optional. Return a safe no-op API so callers don't need to null-check.
        const noop = () => undefined;
    return {
            ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
      ErrorFallback: SentryErrorFallback,
      captureException: noop,
      captureMessage: noop,
      addBreadcrumb: noop,
      setTag: noop,
      setContext: noop,
    };
  }

  init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    
    // Performance Monitoring
    tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // D7 (aprovada em 02/11/2026): "tiro IP e e-mail do Sentry do site". Com true, o SDK guardava o IP de quem teve
    // o erro (e o usuário, se alguém o informasse). O erro continua chegando, sem esses dados.
    sendDefaultPii: false,

    // Error filtering
    beforeSend(event, hint) {
      // Achado (revisão antes do deploy): o SDK anexa a todo evento a URL da página (request.url) e
      // o document.referrer (header Referer) com a query inteira, e usa a URL da página como arquivo
      // do frame quando um erro global chega sem o script de origem. Os links dos e-mails levam
      // credenciais nessa URL. Mesmo filtro dos breadcrumbs abaixo e do Vercel Analytics.
      const { request } = event;
      if (request?.url) request.url = stripSensitiveParams(request.url);
      if (request?.headers?.Referer) request.headers.Referer = stripSensitiveParams(request.headers.Referer);
      for (const exception of event.exception?.values ?? []) {
        for (const frame of exception.stacktrace?.frames ?? []) {
          if (frame.filename) frame.filename = stripSensitiveParams(frame.filename);
        }
      }

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
      // Achado (revisão antes do deploy): o breadcrumb de navegação guarda from/to com a query
      // (ex.: sair de /redefinir-senha?token=... para /login) e o de fetch/xhr guarda a URL da API
      // (ex.: /auth/verify-email?token=...). Copia `data` em vez de alterar: no fetch com erro, o
      // SDK usa o próprio objeto da requisição como `data`.
      if (breadcrumb.data) {
        const data = { ...breadcrumb.data };
        for (const field of BREADCRUMB_URL_FIELDS) {
          if (typeof data[field] === 'string') data[field] = stripSensitiveParams(data[field]);
        }
        breadcrumb.data = data;
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

  // Log initialization only in development
  if (SENTRY_ENVIRONMENT === 'development') {
    console.log('✅ Sentry inicializado:', {
      environment: SENTRY_ENVIRONMENT,
      dsn: SENTRY_DSN.substring(0, 20) + '...',
      release: `xproducoes-frontend@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    });
  }

  // D7: saiu o setUserContext, que mandaria ao Sentry o id, o e-mail, o nome e o papel de quem estava logado.
  // Nenhuma tela o chamava.
  return {
    ErrorBoundary,
    ErrorFallback: SentryErrorFallback,
    captureException,
    captureMessage,
    addBreadcrumb,
    setTag,
    setContext,
  };
};