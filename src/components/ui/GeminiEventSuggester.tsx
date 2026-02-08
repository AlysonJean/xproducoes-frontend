import { useState } from 'react';
import { apiFetch } from '../../services/api';
import { BrandLoader } from '@/components/ui/BrandLoader';
import type { GeminiSuggestionResponse } from '../../types/types';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button, GlassCard } from './StandardComponents';
import { Sparkles } from 'lucide-react';

export const GeminiEventSuggester = () => {
  const { addNotification } = useNotifications();
  const [suggestion, setSuggestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchSuggestion = async () => {
    setIsLoading(true);
    setSuggestion('');
    try {
      const response = await apiFetch('/gemini/suggest-theme');
      setSuggestion((response as GeminiSuggestionResponse).suggestion);
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro na sugestão',
        message: err instanceof Error ? err.message : 'Não foi possível gerar uma sugestão.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassCard className="max-w-4xl mx-auto border-primary/20 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center animate-pulse">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight heading-elegant">
            Sem ideias para o seu evento?
          </h2>
          <p className="text-lg text-muted-foreground/80 font-medium">
            Deixe a nossa Inteligência Artificial criar uma proposta temática exclusiva para você!
          </p>
        </div>

        <Button
          onClick={fetchSuggestion}
          isLoading={isLoading}
          size="xl"
          className="rounded-full px-12 group"
          leftIcon={<Sparkles className="h-5 w-5 group-hover:rotate-12 transition-transform" />}
        >
          Dê-me uma Ideia Brilhante!
        </Button>

        {isLoading && (
          <div className="py-8 animate-in fade-in duration-500">
            <BrandLoader size={80} label="Consultando oráculo digital..." />
          </div>
        )}

        {suggestion && (
          <div className="w-full mt-4 p-8 bg-white/5 border border-white/10 rounded-3xl animate-in slide-in-from-bottom-4 fade-in duration-700">
            <p className="text-xl md:text-2xl font-serif italic leading-relaxed text-foreground">
              "{suggestion}"
            </p>
            <div className="mt-4 flex justify-center">
              <span className="h-1 w-20 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};
