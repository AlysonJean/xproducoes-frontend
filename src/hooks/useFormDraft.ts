import { useCallback } from 'react';

export interface StoredDraft<T> {
  values: T;
  savedAt: number;
}

const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias — depois disso, descarta como stale

// Achado (relato do usuário): fechar/perder um formulário de criação/edição no admin
// (clique fora do modal, fechar a aba, crash do navegador) apagava todo o preenchimento sem
// chance de recuperação. Este hook persiste um rascunho em localStorage por formulário
// (chaveado por tipo + id, para não misturar rascunho de itens diferentes), reaproveitado
// por todos os formulários administrativos.
export function useFormDraft<T>(key: string) {
  const save = useCallback((values: T) => {
    try {
      const payload: StoredDraft<T> = { values, savedAt: Date.now() };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // localStorage indisponível (modo privado restrito etc.) — rascunho é um extra, não crítico.
    }
  }, [key]);

  const load = useCallback((): StoredDraft<T> | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredDraft<T>;
      if (Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
        localStorage.removeItem(key);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, [key]);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // noop
    }
  }, [key]);

  return { save, load, clear };
}
