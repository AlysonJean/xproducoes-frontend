import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, X } from 'lucide-react';

export function DraftRestoreBanner({
  savedAt,
  onRestore,
  onDiscard,
}: {
  savedAt: number;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 mb-6 rounded-xl bg-amber-500/10 border border-amber-500/30">
      <div className="flex items-center gap-3 min-w-0">
        <History className="h-5 w-5 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-900 dark:text-amber-200">
          Encontramos um rascunho não salvo de{' '}
          <strong>{formatDistanceToNow(savedAt, { addSuffix: true, locale: ptBR })}</strong>.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onRestore}
          className="text-sm font-semibold text-amber-900 dark:text-amber-100 hover:underline"
        >
          Restaurar
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="p-1 text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
          aria-label="Descartar rascunho"
          title="Descartar rascunho"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
