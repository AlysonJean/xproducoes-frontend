import { useCallback, useEffect } from 'react';

export interface StoredDraft<T> {
  values: T;
  savedAt: number;
}

const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias — depois disso, descarta como stale

// Conferência de 08/11/2026: "Descartar" no aviso "Descartar alterações?" fechava o formulário, mas o rascunho ficava
// guardado e voltava ao reabrir ("Encontramos um rascunho não salvo"). O rascunho é do formulário e o aviso é da
// página (useUnsavedChangesGuard), então os formulários abertos anotam aqui a chave do rascunho, e o "Descartar"
// apaga os rascunhos dos formulários abertos. Cada página do painel tem um formulário só, dentro do modal que está
// sendo descartado. Fechar sem mudança não apaga nada (o aviso nem aparece).
const openDraftKeys = new Map<string, number>();

export function clearOpenDrafts() {
  for (const key of openDraftKeys.keys()) {
    try {
      localStorage.removeItem(key);
    } catch {
      // noop
    }
  }
}

// Achado (relato do usuário): fechar/perder um formulário de criação/edição no admin
// (clique fora do modal, fechar a aba, crash do navegador) apagava todo o preenchimento sem
// chance de recuperação. Este hook persiste um rascunho em localStorage por formulário
// (chaveado por tipo + id, para não misturar rascunho de itens diferentes), reaproveitado
// por todos os formulários administrativos.
export function useFormDraft<T>(key: string) {
  useEffect(() => {
    openDraftKeys.set(key, (openDraftKeys.get(key) ?? 0) + 1);
    return () => {
      const remaining = (openDraftKeys.get(key) ?? 1) - 1;
      if (remaining > 0) openDraftKeys.set(key, remaining);
      else openDraftKeys.delete(key);
    };
  }, [key]);

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
