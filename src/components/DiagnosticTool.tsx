// frontend/src/components/DiagnosticTool.tsx

import { useState, useEffect } from 'react';
import { Button } from './ui/Button';

import { apiFetch } from '../services/api';
import type { DiagnosticResult } from '../types/types';

export const DiagnosticTool = () => {
  const [results, setResults] = useState<DiagnosticResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');

  useEffect(() => {
    // Monitorar o status de conexão
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const runDiagnostics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch('/diagnostics');
      setResults(data as DiagnosticResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao executar diagnóstico';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-surface p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-primary">Ferramenta de Diagnóstico</h2>

      <div className="mb-4">
        <p className="mb-2 text-tertiary">
          Status de Conexão:
          <span
            className={connectionStatus === 'online' ? 'text-success ml-2' : 'text-danger ml-2'}
          >
            {connectionStatus === 'online' ? '🟢 Online' : '🔴 Offline'}
          </span>
        </p>

        <Button
          onClick={runDiagnostics}
          disabled={isLoading || connectionStatus === 'offline'}
          variant="primary"
          isLoading={isLoading}
        >
          {isLoading ? 'Executando...' : 'Executar Diagnóstico'}
        </Button>
      </div>

      {error && <div className="bg-danger/10 text-danger p-4 rounded mb-4">Erro: {error}</div>}

      {results && (
        <div className="border border-border rounded p-4">
          <p className="font-semibold mb-2 text-primary">
            Status Geral:
            <span className={results.status === 'ok' ? 'text-success ml-2' : 'text-danger ml-2'}>
              {results.status === 'ok' ? '✅ Funcionando' : '❌ Com Problemas'}
            </span>
          </p>

          <p className="text-tertiary text-sm mb-4">
            Verificação realizada em: {new Date(results.timestamp).toLocaleString()}
          </p>

          <div className="space-y-2">
            {Object.entries(results.services).map(([service, { status, message }]) => (
              <div key={service} className="p-2 border-b">
                <p className="font-medium flex items-center">
                  {status === 'ok' ? '✅' : '❌'}
                  <span className="ml-2 capitalize">{service}</span>
                </p>
                <p className="text-sm text-tertiary">{message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-bold mb-2">Logs do Console</h3>
        <p className="text-sm text-tertiary mb-2">
          Verifique o console do navegador (F12) para informações de depuração mais detalhadas.
        </p>
      </div>
    </div>
  );
};
