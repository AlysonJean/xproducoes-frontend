// src/components/SentryErrorFallback.tsx
import React from 'react';

interface SentryErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export const SentryErrorFallback: React.FC<SentryErrorFallbackProps> = ({ error, resetError }) => {
  const isDevelopment = import.meta.env.VITE_SENTRY_ENVIRONMENT === 'development' || import.meta.env.MODE === 'development';

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">😱</div>
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
            Algo deu errado!
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Desculpe, ocorreu um erro inesperado. Nossa equipe foi notificada automaticamente.
          </p>
          {isDevelopment && (
            <details className="text-left mb-4">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                Detalhes do erro (apenas em desenvolvimento)
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto max-h-40">
                {error?.toString()}
                {error?.stack && (
                  <>
                    {'\n\nStack trace:\n'}
                    {error.stack}
                  </>
                )}
              </pre>
            </details>
          )}
          <div className="flex gap-2 justify-center">
            <button
              onClick={resetError}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
            >
              Tentar novamente
            </button>
            <button
              onClick={() => (window.location.href = '/')}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
