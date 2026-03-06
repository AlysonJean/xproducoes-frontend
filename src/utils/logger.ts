// ✅ PRODUCTION-SAFE LOGGING SYSTEM
import type { LogLevel, LogEntry } from '@/types';

// Lazy sentry getter to avoid circular dependency with main.tsx
const getSentry = () => {
  try {
    // Dynamic import to avoid circular dependency
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).__SENTRY__;
  } catch {
    return null;
  }
};

class Logger {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isDevelopment = (import.meta as any).env?.MODE === 'development';

  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const prefix = context ? `[${context}]` : '';
    const timestamp = new Date().toISOString();
    return `${timestamp} ${level.toUpperCase()} ${prefix} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    // Em produção, só loga warn e error
    if (!this.isDevelopment) {
      return level === 'warn' || level === 'error';
    }
    return true;
  }

  private log(level: LogLevel, message: string, context?: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, context);

    if (level === 'debug') {
      console.debug(formattedMessage, data || '');
    } else if (level === 'info') {
      console.info(formattedMessage, data || '');
    } else if (level === 'warn') {
      console.warn(formattedMessage, data || '');
      // Send to Sentry as breadcrumb
      const sentry = getSentry();
      if (sentry?.addBreadcrumb) {
        sentry.addBreadcrumb({
          message: formattedMessage,
          level: 'warning',
          data: data ? { data } : undefined,
          category: context || 'logger',
        });
      }
    } else if (level === 'error') {
      console.error(formattedMessage, data || '');
      // Send to Sentry as exception
      const sentry = getSentry();
      if (sentry?.captureException && data instanceof Error) {
        sentry.captureException(data, {
          tags: { context },
          extra: { message, formattedMessage },
        });
      } else if (sentry?.captureMessage) {
        sentry.captureMessage(formattedMessage, 'error');
      }
    }

    // Em produção, enviar para serviço de monitoramento adicional
    if (!this.isDevelopment && (level === 'warn' || level === 'error')) {
      this.sendToMonitoringService({
        level,
        message,
        timestamp: new Date().toISOString(),
        context: context ? { category: context } : undefined,
        data
      });
    }
  }

  private sendToMonitoringService(_entry: LogEntry): void {
    // TODO: Integrar com serviço de monitoramento adicional (DataDog, etc.)
    // Example: datadog.captureLog(entry);
  }

  debug(message: string, context?: string, data?: unknown): void {
    this.log('debug', message, context, data);
  }

  info(message: string, context?: string, data?: unknown): void {
    this.log('info', message, context, data);
  }

  warn(message: string, context?: string, data?: unknown): void {
    this.log('warn', message, context, data);
  }

  error(message: string, context?: string, data?: unknown): void {
    this.log('error', message, context, data);
  }
}

export const logger = new Logger();

// Backward compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logDebug(...args: any[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((import.meta as any).env?.MODE === 'development') {
    console.debug('[DEBUG]', ...args);
  }
}
