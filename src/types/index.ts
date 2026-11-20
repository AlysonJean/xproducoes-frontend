// Re-export all types for backward compatibility
export * from './enums';
export * from './domains/equipment';
export * from './domains/dashboard';
export * from './ui/index';
export * from './forms/index';

// Export specific types from types.ts that are not in conflict
export type {
  PortfolioFilters,
  PortfolioItem,
  AnchorOptions,
  ScriptOptions,
} from './types';

// ================================
// LOG (utils/logger.ts)
// ================================
// Limpeza de 20/11/2026: saíram daqui os tipos utilitários, de formulário, tema, i18n, PWA, gráficos,
// virtualização e testes que nada importava; ficam só os do logger.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  data?: unknown;
}
