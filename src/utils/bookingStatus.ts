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
  // Onda 2b (D8): o pagamento devolvido no reembolso registrado.
  REFUNDED: 'Devolvido',
};

export const BOOKING_STATUS_OPTIONS = toOptions(BOOKING_STATUS_LABELS);
export const DELIVERY_STATUS_OPTIONS = toOptions(DELIVERY_STATUS_LABELS);
// As que se escolhem à mão: "Devolvido" entra só pelo reembolso (Reembolsada, pela lista) e sai ao voltar a Cancelada.
export const PAYMENT_STATUS_OPTIONS: Option[] = [
  { value: '', label: 'Não informado' },
  ...toOptions(PAYMENT_STATUS_LABELS).filter((option) => option.value !== 'REFUNDED'),
];
/** Onda 2b (D8): as opções do seletor de pagamento; com o pagamento Devolvido, só ele (o seletor fica travado). */
export const paymentOptionsFor = (current: string | null | undefined): Option[] =>
  current === 'REFUNDED' ? [{ value: 'REFUNDED', label: PAYMENT_STATUS_LABELS.REFUNDED }] : PAYMENT_STATUS_OPTIONS;

// Auditoria do status (21/11/2026), C3: as trocas que valem a partir de cada status, iguais às do servidor
// (backend/src/services/booking/bookingTransitions.ts, STATUS_TRANSITIONS). O seletor da lista só oferece estas; a data
// do evento (Em andamento e Concluída só a partir do dia dele) e o contrato o servidor confere e explica no 409.
export const BOOKING_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING', 'CONFIRMED', 'CANCELLED'],
  PENDING: ['DRAFT', 'CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['CONFIRMED', 'COMPLETED', 'CANCELLED'],
  COMPLETED: ['CONFIRMED', 'IN_PROGRESS'],
  CANCELLED: ['PENDING', 'REFUNDED'],
  REFUNDED: ['CANCELLED'],
};

/** As opções do seletor de status de uma reserva: o status atual e as trocas que valem a partir dele. */
export const bookingStatusOptionsFrom = (status?: string | null): Option[] => {
  const next = (status && BOOKING_STATUS_TRANSITIONS[status]) || null;
  if (!status || !next) return BOOKING_STATUS_OPTIONS;
  return BOOKING_STATUS_OPTIONS.filter((option) => option.value === status || next.includes(option.value));
};

// B2: uma reserva nova entra como Rascunho, Pendente ou Confirmada.
export const NEW_BOOKING_STATUS_OPTIONS = BOOKING_STATUS_OPTIONS.filter((option) =>
  ['DRAFT', 'PENDING', 'CONFIRMED'].includes(option.value),
);

// B1 (com a revisão de 21/11/2026): na reserva cancelada ou reembolsada, a entrega só volta ao início ou registra o
// recolhimento do que ficou no local (aguardando retirada, concluída), como o servidor (deliveryRefusal).
const CLOSED_DELIVERY = ['PENDING', 'PICKUP_PENDING', 'COMPLETED'];

/** As opções do seletor de entrega de uma reserva: na cancelada ou reembolsada, as do recolhimento (e a atual). */
export const deliveryOptionsFor = (status?: string | null, current?: string | null): Option[] => {
  if (status !== 'CANCELLED' && status !== 'REFUNDED') return DELIVERY_STATUS_OPTIONS;
  return DELIVERY_STATUS_OPTIONS.filter((option) => CLOSED_DELIVERY.includes(option.value) || option.value === (current || 'PENDING'));
};

// Onda 2 da auditoria do status (C5): a reserva aceita pelo site segue Pendente até a equipe registrar o sinal e
// confirmar. Na lista ela aparecia só como "Pendente"; o selo diz em que pé está.
export const acceptedContractBadge = (
  booking: { status?: string | null; paymentStatus?: string | null; acceptedContract?: { initialPaymentDueAt: string | null } | null },
  now: number = Date.now(),
): { label: string; variant: StandardVariant } | null => {
  if (!booking.acceptedContract || (booking.status !== 'PENDING' && booking.status !== 'DRAFT')) return null;
  if (booking.paymentStatus === 'PARTIAL' || booking.paymentStatus === 'PAID') return { label: 'Sinal registrado — falta confirmar', variant: 'info' };
  const due = booking.acceptedContract.initialPaymentDueAt ? Date.parse(booking.acceptedContract.initialPaymentDueAt) : NaN;
  if (Number.isFinite(due) && due < now) return { label: 'Sinal vencido', variant: 'destructive' };
  return { label: 'Aceito — aguardando sinal', variant: 'warning' };
};

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
  /** Auditoria do status (21/11/2026), C4: a data do aceite do contrato pelo site (o servidor já mandava). */
  contractAcceptedAt?: string | null;
}

type ClientProposalBooking = { status?: string | null; paymentStatus?: string | null; proposal?: ProposalSummaryView | null };

// C4: depois do aceite a reserva segue Pendente até a equipe registrar o sinal e confirmar. O selo dizia "Proposta
// enviada — aguardando sua resposta" e, passada a validade, "Proposta vencida — peça uma nova", enquanto o cartão do
// contrato pedia o PIX.
export const CONTRACT_ACCEPTED_LABEL = 'Contrato aceito — aguardando o sinal';

// Revisão de 21/11/2026: com o sinal já registrado pela equipe (pagamento parcial ou pago), o selo não pede o sinal.
export const CONTRACT_PAID_LABEL = 'Contrato aceito — sinal recebido';

const contractAccepted = (booking: ClientProposalBooking) =>
  booking.status === 'PENDING' && Boolean(booking.proposal?.contractAcceptedAt);

/** Proposta enviada de reserva pendente que já venceu: a conta do servidor (expired) ou a validade já passada. */
export const proposalExpiredForClient = (booking: ClientProposalBooking, now: number = Date.now()): boolean => {
  const proposal = booking.proposal;
  if (booking.status !== 'PENDING' || !proposal?.sentAt) return false;
  // C4: aceita não vence mais (a validade é da proposta, e ela já foi aceita).
  if (contractAccepted(booking)) return false;
  if (proposal.expired === true) return true;
  const until = proposal.validUntil ? Date.parse(proposal.validUntil) : NaN;
  return Number.isFinite(until) && now > until;
};

export const clientBookingStatusLabel = (booking: ClientProposalBooking): string => {
  if (contractAccepted(booking)) {
    return booking.paymentStatus === 'PARTIAL' || booking.paymentStatus === 'PAID' ? CONTRACT_PAID_LABEL : CONTRACT_ACCEPTED_LABEL;
  }
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
  // C4: com o contrato aceito, a validade da proposta não interessa mais (o cartão do contrato mostra os prazos).
  if (contractAccepted(booking)) return null;
  const until = proposal.validUntil ? new Date(proposal.validUntil) : null;
  const day = until && !Number.isNaN(until.getTime()) ? brasiliaDay.format(until) : null;
  if (proposalExpiredForClient(booking, now)) {
    return `A validade da proposta acabou${day ? ` em ${day}` : ''}. Fale com a equipe para receber uma nova.`;
  }
  return day ? `Proposta válida até ${day}.` : null;
};

/** Onda 3 da auditoria do status (M10): o resumo do card "A receber" do painel. */
export const receivablesText = (
  receivables?: { noPaymentCount: number; partialCount: number; overdueBalanceCount: number } | null,
): string => {
  if (!receivables) return 'Reservas confirmadas com pagamento em aberto';
  const parts = [`${receivables.noPaymentCount} sem pagamento registrado`, `${receivables.partialCount} só com o sinal`];
  if (receivables.overdueBalanceCount > 0) parts.push(`${receivables.overdueBalanceCount} com o saldo vencido`);
  return parts.join(' · ');
};

export interface JourneyStep {
  label: string;
  done: boolean;
}

/**
 * Onda 3 da auditoria do status: a trilha da reserva para o cliente (Pedido recebido → Proposta enviada → Contrato
 * aceito → Sinal recebido → Confirmada → Concluída) e o próximo passo dele. As etapas que a reserva não teve (a criada
 * pela equipe já confirmada, sem proposta nem contrato) não aparecem. Rascunho, cancelada e reembolsada: sem trilha (o
 * selo do status já diz).
 */
export const clientJourney = (
  booking: ClientProposalBooking & { eventDate?: string | null; review?: unknown },
  now: number = Date.now(),
): { steps: JourneyStep[]; nextStep: string | null } | null => {
  const status = booking.status ?? '';
  if (!['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(status)) return null;
  const confirmed = status !== 'PENDING';
  const sent = Boolean(booking.proposal?.sentAt);
  const accepted = Boolean(booking.proposal?.contractAcceptedAt);
  const paid = booking.paymentStatus === 'PARTIAL' || booking.paymentStatus === 'PAID';

  const steps: JourneyStep[] = [{ label: 'Pedido recebido', done: true }];
  if (sent || !confirmed) steps.push({ label: 'Proposta enviada', done: sent || confirmed });
  if (accepted || (sent && !confirmed)) steps.push({ label: 'Contrato aceito', done: accepted });
  if (accepted || paid) steps.push({ label: 'Sinal recebido', done: paid });
  steps.push({ label: 'Confirmada', done: confirmed });
  steps.push({ label: 'Concluída', done: status === 'COMPLETED' });

  let nextStep: string | null = null;
  const eventTime = booking.eventDate ? Date.parse(booking.eventDate) : NaN;
  if (status === 'PENDING' && Number.isFinite(eventTime) && eventTime < now) {
    // Revisão da onda 3: pedido parado com a data já passada (não está mais "montando o orçamento").
    nextStep = 'A data do evento já passou. Se ainda quiser o evento, fale com a equipe.';
  } else if (status === 'PENDING') {
    if (!sent) nextStep = 'Estamos montando o seu orçamento. A proposta chega por e-mail.';
    // O texto vale com o aceite online ligado ou não (com ele desligado, a resposta é pela equipe).
    else if (!accepted) nextStep = proposalExpiredForClient(booking, now) ? null : 'Confira a proposta que chegou por e-mail e responda pelo link dela.';
    else if (!paid) nextStep = 'Pague a parcela inicial (o PIX está no cartão do contrato) e envie o comprovante. A equipe confirma a reserva depois.';
    else nextStep = 'Recebemos a parcela inicial. A equipe vai confirmar a reserva.';
  } else if (status === 'CONFIRMED') {
    nextStep = 'Reserva confirmada. Perto da data, a equipe fala com você para combinar os detalhes.';
  } else if (status === 'IN_PROGRESS') {
    nextStep = 'O evento está acontecendo. Qualquer coisa, fale com a equipe pelos contatos desta página.';
  } else {
    nextStep = booking.review
      ? 'Evento concluído. Obrigado pela sua avaliação!'
      : 'Evento concluído. Obrigado! Se puder, deixe sua avaliação: ela ajuda muito a equipe.';
  }
  return { steps, nextStep };
};
