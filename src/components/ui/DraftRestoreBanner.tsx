import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, X } from 'lucide-react';

// Achado (auditoria do design system): paleta âmbar fixa (amber-500/600/700/900) com `dark:` só em
// parte (o ícone ficava amber-600 nos dois temas). Agora segue o padrão de aviso suave do design
// system — fundo e borda do token warning, texto do tema — e os botões têm foco visível.
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
    <div className="flex items-center justify-between gap-4 p-4 mb-6 rounded-xl bg-warning/10 border border-warning/30">
      <div className="flex items-center gap-3 min-w-0">
        <History className="h-5 w-5 text-warning shrink-0" aria-hidden="true" />
        <p className="text-sm text-foreground">
          Encontramos um rascunho não salvo de{' '}
          <strong>{formatDistanceToNow(savedAt, { addSuffix: true, locale: ptBR })}</strong>.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onRestore}
          className="rounded-sm px-1 text-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Restaurar
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Descartar rascunho"
          title="Descartar rascunho"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
