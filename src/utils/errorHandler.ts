// ✅ CENTRALIZED ERROR HANDLING SYSTEM
import { logger } from './logger';

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public context?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Erro de conexão') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ErrorHandler {
  static handle(error: unknown, context: string = 'Unknown'): string {
    let message = 'Ocorreu um erro inesperado';
    
    if (error instanceof APIError) {
      message = error.message;
      logger.error(`API Error: ${error.message}`, context, { 
        status: error.status, 
        code: error.code 
      });
    } else if (error instanceof ValidationError) {
      message = error.message;
      logger.warn(`Validation Error: ${error.message}`, context, { 
        field: error.field, 
        value: error.value 
      });
    } else if (error instanceof NetworkError) {
      message = 'Problema de conexão. Verifique sua internet.';
      logger.error(`Network Error: ${error.message}`, context);
    } else if (error instanceof Error) {
      message = error.message;
      logger.error(`Generic Error: ${error.message}`, context, { stack: error.stack });
    } else {
      logger.error(`Unknown Error: ${String(error)}`, context);
    }

    return message;
  }

  static async handleAsync<T>(
    fn: () => Promise<T>,
    context: string = 'AsyncOperation',
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await fn();
    } catch (error) {
      this.handle(error, context);
      return fallback;
    }
  }

  static handleSync<T>(
    fn: () => T,
    context: string = 'SyncOperation',
    fallback?: T
  ): T | undefined {
    try {
      return fn();
    } catch (error) {
      this.handle(error, context);
      return fallback;
    }
  }
}

// ✅ Enhanced Error Boundary Hook
export const useErrorHandler = () => {
  const handleError = (error: unknown, context?: string) => {
    return ErrorHandler.handle(error, context);
  };

  const handleAsyncError = async <T>(
    fn: () => Promise<T>,
    context?: string,
    fallback?: T
  ) => {
    return ErrorHandler.handleAsync(fn, context, fallback);
  };

  return { handleError, handleAsyncError };
};

// ✅ API Error Factory
export const createAPIError = (response: Response, context?: string): APIError => {
  return new APIError(
    `HTTP ${response.status}: ${response.statusText}`,
    response.status,
    response.status.toString(),
    context
  );
};
