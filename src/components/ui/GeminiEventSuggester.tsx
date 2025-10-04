// Caminho do arquivo: frontend/src/shared/GeminiEventSuggester.tsx

import { useState } from 'react';

import { apiFetch } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { GeminiSuggestionResponse } from '../../types/types';

export const GeminiEventSuggester = () => {
  const [suggestion, setSuggestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fetchSuggestion = async () => {
    setIsLoading(true);
    setError('');
    setSuggestion('');
    try {
  const response = await apiFetch('/api/gemini/suggest-theme');
      setSuggestion((response as GeminiSuggestionResponse).suggestion);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Não foi possível gerar uma sugestão. Tente novamente mais tarde.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary/80 to-primary/60 text-primary-foreground p-8 rounded-lg shadow-2xl text-center">
      <h2 className="text-3xl font-bold mb-2">Sem ideias para o seu evento?</h2>
      <p className="text-primary-foreground/80 mb-6">
        Deixe a nossa Inteligência Artificial criar uma sugestão para si!
      </p>
      <button
        onClick={fetchSuggestion}
        disabled={isLoading}
        className="bg-background text-foreground font-bold py-3 px-8 rounded-full transition-transform transform hover:scale-105 disabled:opacity-50 border border-border"
      >
        {isLoading ? 'A pensar...' : 'Dê-me uma Ideia!'}
      </button>

      {isLoading && (
        <div className="mt-6">
          <LoadingSpinner label="A pensar..." />
        </div>
      )}

      {error && <p className="mt-6 text-yellow-300 bg-yellow-900/50 p-3 rounded-md">{error}</p>}

      {suggestion && (
        <div className="mt-6 p-6 bg-card/20 border border-border/30 rounded-lg animate-fade-in">
          <p className="text-lg font-semibold italic">"{suggestion}"</p>
        </div>
      )}
    </div>
  );
};
