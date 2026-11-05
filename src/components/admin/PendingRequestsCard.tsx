// P3 (decisão aprovada em 02/11/2026): cartão no topo do painel com os pedidos de clientes aguardando
// resposta e a idade do mais antigo — cinza até 4 h, amarelo até 24 h, vermelho depois (24 h é o
// prazo que o site promete). Pedidos com evento já passado aparecem à parte. Sem pedidos esperando e
// sem passados, o cartão não aparece.
import React from 'react';
import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { formatPendingAge, PENDING_LEVEL_CLASSES, type PendingRequestsSummary } from '../../hooks/usePendingRequests';

interface PendingRequestsCardProps {
  summary: PendingRequestsSummary | null;
}

export const PendingRequestsCard: React.FC<PendingRequestsCardProps> = ({ summary }) => {
  if (!summary || (summary.count === 0 && summary.pastEventCount === 0)) return null;

  const { count, level, oldestAgeHours, pastEventCount } = summary;
  const classes = count > 0 && level ? PENDING_LEVEL_CLASSES[level] : PENDING_LEVEL_CLASSES.gray;

  return (
    <Link
      to="/admin/reservas?status=PENDING"
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 sm:p-5 transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${classes}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Inbox className="h-6 w-6 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          {count > 0 ? (
            <p className="font-bold">
              {count} {count === 1 ? 'pedido aguardando' : 'pedidos aguardando'} resposta, o mais antigo {formatPendingAge(oldestAgeHours)}
            </p>
          ) : (
            <p className="font-bold">Nenhum pedido aguardando resposta</p>
          )}
          {pastEventCount > 0 && (
            <p className="text-sm opacity-90">
              {pastEventCount} {pastEventCount === 1 ? 'pedido pendente com evento que já passou' : 'pedidos pendentes com evento que já passou'}: cancele ou registre o que aconteceu.
            </p>
          )}
        </div>
      </div>
      <span className="text-sm font-semibold underline underline-offset-2 shrink-0">Ver pedidos</span>
    </Link>
  );
};

export default PendingRequestsCard;
