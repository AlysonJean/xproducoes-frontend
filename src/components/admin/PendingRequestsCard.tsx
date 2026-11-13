// P3 (decisão aprovada em 02/11/2026): cartão no topo do painel com os pedidos de clientes aguardando resposta e a
// idade do mais antigo — cinza até 4 h, amarelo até 24 h, vermelho depois (24 h é a meta interna de resposta; o site promete até 5 dias). Os
// pedidos com a data do evento já passada aparecem à parte. Cada linha abre a lista de Reservas já filtrada (mesmas
// regras do número do menu); os mais antigos primeiro. Sem pedidos esperando e sem passados, o cartão não aparece.
import React from 'react';
import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import {
  formatWaitingAge,
  pastEventRequestsText,
  waitingAge,
  waitingRequestsText,
  WAITING_TONE_CLASSES,
  type AdminSummary,
} from '../../stores/adminSummary';

// Os filtros da lista de Reservas (BookingListPage) que reproduzem cada número do resumo.
export const WAITING_REQUESTS_HREF = '/admin/reservas?status=PENDING&origem=cliente&periodo=proximos&proposta=nao-enviada&ordem=antigos';
export const PAST_EVENT_REQUESTS_HREF = '/admin/reservas?status=PENDING&origem=cliente&periodo=passado&ordem=antigos';

interface PendingRequestsCardProps {
  summary: AdminSummary | null;
}

const linkClass = 'rounded underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export const PendingRequestsCard: React.FC<PendingRequestsCardProps> = ({ summary }) => {
  if (!summary || (summary.waitingRequests === 0 && summary.pastEventRequests === 0)) return null;

  const { waitingRequests, pastEventRequests } = summary;
  const age = waitingRequests > 0 ? waitingAge(summary.oldestWaitingAt) : null;
  const classes = WAITING_TONE_CLASSES[age?.tone ?? 'muted'];

  return (
    <section
      aria-label="Pedidos de clientes aguardando resposta"
      data-tone={age?.tone ?? 'muted'}
      className={`flex items-start gap-3 rounded-2xl border p-4 sm:p-5 ${classes}`}
    >
      <Inbox className="h-6 w-6 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        {waitingRequests > 0 ? (
          <Link to={WAITING_REQUESTS_HREF} className={`block font-bold ${linkClass}`}>
            {waitingRequestsText(waitingRequests)}
            {age ? `, o mais antigo ${formatWaitingAge(age.hours)}` : ''}
          </Link>
        ) : (
          <p className="font-bold">Nenhum pedido aguardando resposta</p>
        )}
        {pastEventRequests > 0 && (
          <Link to={PAST_EVENT_REQUESTS_HREF} className={`block text-sm opacity-90 ${linkClass}`}>
            {pastEventRequestsText(pastEventRequests)}
          </Link>
        )}
      </div>
    </section>
  );
};

export default PendingRequestsCard;
