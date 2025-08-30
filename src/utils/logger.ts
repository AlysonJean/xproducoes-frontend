// ✅ PRODUCTION-SAFE LOGGING SYSTEM
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  timestamp: string;
}

class Logger {
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
    
    switch (level) {
      case 'debug':
        console.debug(formattedMessage, data || '');
        break;
      case 'info':
        console.info(formattedMessage, data || '');
        break;
      case 'warn':
        console.warn(formattedMessage, data || '');
        break;
      case 'error':
        console.error(formattedMessage, data || '');
        break;
    }

    // Em produção, enviar para serviço de monitoramento
    if (!this.isDevelopment && (level === 'warn' || level === 'error')) {
      this.sendToMonitoringService({ level, message, context, data, timestamp: new Date().toISOString() });
    }
  }

  private sendToMonitoringService(_entry: LogEntry): void {
    // TODO: Integrar com serviço de monitoramento (Sentry, LogRocket, etc.)
    // Example: sentry.captureMessage(entry.message, entry.level);
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
export function logDebug(...args: any[]) {
  if ((import.meta as any).env?.MODE === 'development') {
    console.debug('[DEBUG]', ...args);
  }
}
