import type { StandardVariant } from '../components/ui/StandardTypes';

// Fonte única de rótulos, opções de seletor e cor de selo para status de reserva, entrega e
// pagamento. Achado (auditoria do design system): cada tela tinha a sua lista — filtro, tabela,
// calendário, ficha e painel com 2 a 7 opções diferentes, enum cru ("CONFIRMED") em selos e status de
// entrega misturado no filtro de status. Um <select> com valor fora da lista mostra a primeira opção,
// então reservas apareciam como "Pendente" sem estar.

type Option = { value: string; label: string };
const toOptions = (labels: Record<string, string>): Option[] =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

// Espelha o enum BookingStatus do backend (prisma/schema.prisma).
export const BOOKING_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
  REFUNDED: 'Reembolsada',
};

export const BOOKING_STATUS_VARIANT: Record<string, StandardVariant> = {
  DRAFT: 'ghost',
  PENDING: 'warning',
  CONFIRMED: 'success',
  IN_PROGRESS: 'info',
  COMPLETED: 'primary',
  CANCELLED: 'destructive',
  REFUNDED: 'outline',
};

// Espelha o enum DeliveryStatus do backend.
export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PREPARING: 'Em preparação',
  ON_THE_WAY: 'A caminho',
  ARRIVED: 'No local',
  SETUP_COMPLETE: 'Montado',
  PICKUP_PENDING: 'Aguardando retirada',
  COMPLETED: 'Concluída',
};

// Situação do pagamento (bookings.paymentStatus; vazio = não informado).
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PARTIAL: 'Parcial',
  PAID: 'Pago',
};

export const BOOKING_STATUS_OPTIONS = toOptions(BOOKING_STATUS_LABELS);
export const DELIVERY_STATUS_OPTIONS = toOptions(DELIVERY_STATUS_LABELS);
export const PAYMENT_STATUS_OPTIONS: Option[] = [{ value: '', label: 'Não informado' }, ...toOptions(PAYMENT_STATUS_LABELS)];

export const bookingStatusLabel = (status?: string | null) =>
  (status && BOOKING_STATUS_LABELS[status]) || status || '—';
export const bookingStatusVariant = (status?: string | null): StandardVariant =>
  (status && BOOKING_STATUS_VARIANT[status]) || 'ghost';
export const deliveryStatusLabel = (status?: string | null) =>
  (status && DELIVERY_STATUS_LABELS[status]) || status || '—';

// D11 (aprovada em 02/11/2026): "o cliente vê 'Proposta enviada, aguardando sua resposta'". Na área do cliente, a
// reserva pendente cuja proposta a equipe enviou ("Enviar proposta" da ficha; a API manda proposal.sentAt) ganha este
// rótulo; sem envio, o de sempre ("Pendente"). O valor ainda sem preço continua "Em preparação" (formatBookingTotal):
// só dá para enviar proposta com valor.
// Auditoria do orçamento (12/11/2026), O11/D6: a proposta vencida continuava "aguardando sua resposta" (o link já dizia
// "venceu"). Agora ela aparece como vencida, e o cliente vê a validade.
export const PROPOSAL_SENT_LABEL = 'Proposta enviada — aguardando sua resposta';
export const PROPOSAL_EXPIRED_LABEL = 'Proposta vencida — peça uma nova';

/**
 * O resumo da proposta que a API manda em cada reserva (`proposal`, backend/src/services/proposal/proposalService.ts):
 * sentAt (último envio), validUntil (a validade que vale: fim do dia em Brasília, nunca depois da véspera do evento),
 * expired (venceu), sentTotal (o total que o link mostrava no último envio) e changedSinceSent (a reserva mudou
 * depois do último envio). Sem envio, só sentAt nulo; os outros campos podem faltar (resposta antiga).
 */
export interface ProposalSummaryView {
  sentAt?: string | null;
  validUntil?: string | null;
  expired?: boolean;
  sentTotal?: number | null;
  changedSinceSent?: boolean | null;
}

type ClientProposalBooking = { status?: string | null; proposal?: ProposalSummaryView | null };

/** Proposta enviada de reserva pendente que já venceu: a conta do servidor (expired) ou a validade já passada. */
export const proposalExpiredForClient = (booking: ClientProposalBooking, now: number = Date.now()): boolean => {
  const proposal = booking.proposal;
  if (booking.status !== 'PENDING' || !proposal?.sentAt) return false;
  if (proposal.expired === true) return true;
  const until = proposal.validUntil ? Date.parse(proposal.validUntil) : NaN;
  return Number.isFinite(until) && now > until;
};

export const clientBookingStatusLabel = (booking: ClientProposalBooking): string => {
  if (booking.status === 'PENDING' && booking.proposal?.sentAt) {
    return proposalExpiredForClient(booking) ? PROPOSAL_EXPIRED_LABEL : PROPOSAL_SENT_LABEL;
  }
  return bookingStatusLabel(booking.status);
};

const brasiliaDay = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * A validade para o cliente, na reserva pendente com proposta enviada: "Proposta válida até DD/MM/AAAA." ou, vencida,
 * "A validade da proposta acabou em DD/MM/AAAA. Fale com a equipe para receber uma nova." null sem proposta enviada
 * (ou sem a validade, numa resposta antiga, enquanto não venceu).
 */
export const clientProposalValidityText = (booking: ClientProposalBooking, now: number = Date.now()): string | null => {
  const proposal = booking.proposal;
  if (booking.status !== 'PENDING' || !proposal?.sentAt) return null;
  const until = proposal.validUntil ? new Date(proposal.validUntil) : null;
  const day = until && !Number.isNaN(until.getTime()) ? brasiliaDay.format(until) : null;
  if (proposalExpiredForClient(booking, now)) {
    return `A validade da proposta acabou${day ? ` em ${day}` : ''}. Fale com a equipe para receber uma nova.`;
  }
  return day ? `Proposta válida até ${day}.` : null;
};
