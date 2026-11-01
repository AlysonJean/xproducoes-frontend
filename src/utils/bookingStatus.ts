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
  PICKUP_PENDING: 'Aguardando recolha',
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
