
// ✅ PRODUCTION-SAFE LOGGING SYSTEM
import type { LogLevel, LogEntry } from '@/types';

interface SentryType {
  addBreadcrumb?: (val: Record<string, unknown>) => void;
  captureException?: (val: unknown, hints?: Record<string, unknown>) => void;
  captureMessage?: (val: string, level?: string) => void;
}

const getSentry = (): SentryType | null => {
  try {
    // Dynamic import to avoid circular dependency
        return (window as unknown as { __SENTRY__?: SentryType }).__SENTRY__ || null;
  } catch {
    return null;
  }
};

class Logger {
    private isDevelopment = (import.meta as unknown as { env?: { MODE?: string } }).env?.MODE === 'development';

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
    // Integração com serviço de monitoramento pode ser adicionada aqui
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
export function logDebug(...args: unknown[]) {
    if ((import.meta as unknown as { env?: { MODE?: string } }).env?.MODE === 'development') {
    console.debug('[DEBUG]', ...args);
  }
}
