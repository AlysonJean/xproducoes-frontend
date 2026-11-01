// src/components/SentryErrorFallback.tsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';

interface SentryErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

// Achados (auditoria do design system): `bg-surface` (token inexistente), cinzas fixos com dark:
// manual, `bg-primary text-white` (ilegível no tema escuro, onde o primary é prata),
// `hover:bg-primary-dark` (não existe) e botões feitos à mão. Agora: tokens do tema e <Button>.
export const SentryErrorFallback: React.FC<SentryErrorFallbackProps> = ({ error, resetError }) => {
  const isDevelopment = import.meta.env.VITE_SENTRY_ENVIRONMENT === 'development' || import.meta.env.MODE === 'development';

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-md w-full bg-card text-card-foreground border border-border rounded-xl shadow-xl p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-foreground">
            Algo deu errado!
          </h1>
          <p className="text-muted-foreground mb-4">
            Desculpe, ocorreu um erro inesperado. Nossa equipe foi notificada automaticamente.
          </p>
          {isDevelopment && (
            <details className="text-left mb-4">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Detalhes do erro (apenas em desenvolvimento)
              </summary>
              <pre className="mt-2 p-2 bg-muted text-foreground rounded-md text-xs overflow-auto max-h-40">
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
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button size="sm" onClick={resetError}>
              Tentar novamente
            </Button>
            <Button size="sm" variant="ghost" onClick={() => (window.location.href = '/')}>
              Voltar ao início
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
