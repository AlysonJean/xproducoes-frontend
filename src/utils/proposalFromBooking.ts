import type { BookingDetails } from '../types/types';
import { bookingEmail, bookingPhone } from './bookingContact';
import { formatBookingCode } from './bookingCode';
import { NOT_DEFINED } from './briefing';

// 18/11/2026: o pedido do briefing chega sem itens do catálogo, e o painel não tinha como pôr kit e equipamentos nele
// para montar o orçamento (a edição mostra os itens só para leitura). O "Montar orçamento" da ficha abre a Proposta
// Rápida com ?reserva=<código>: a tela vem com os dados da reserva e salvar troca os itens dela (PUT /bookings/:id com
// as linhas), sem criar outra reserva. O servidor confere de novo a mesma regra de quando os itens podem mudar.

/** O caminho da Proposta Rápida para montar o orçamento de uma reserva. */
export const proposalForBookingPath = (bookingId: string): string =>
  `/admin/orcamentos/novo?reserva=${encodeURIComponent(bookingId)}`;

type BookingSource = Partial<BookingDetails> & { idempotencyKey?: string | null };

/** Reserva importada do histórico (HIST-…): o valor cobrado na época, que não muda. */
export const isHistoryBooking = (booking: BookingSource): boolean =>
  Boolean(booking.idempotencyKey?.startsWith('HIST-'));

/**
 * Por que os itens desta reserva não podem mudar (null quando podem): só com a proposta em aberto (rascunho ou pendente),
 * fora do histórico e sem contrato aceito. A mesma regra do servidor (bookingCrudService.replacementForItems).
 */
export function itemsLockedReason(booking: BookingSource): string | null {
  if (isHistoryBooking(booking)) return 'Reserva importada do histórico: os itens dela não mudam.';
  const status = booking.status || 'PENDING';
  if (status !== 'DRAFT' && status !== 'PENDING') {
    return 'Os itens só mudam com a proposta em aberto (rascunho ou pendente). Reserva confirmada, em andamento, concluída ou cancelada fica com os itens que tem.';
  }
  if (booking.contractSummary?.state === 'ACCEPTED') return 'O cliente já aceitou o contrato desta reserva: os itens não mudam.';
  return null;
}

// O horário do campo datetime-local, no fuso do aparelho (o mesmo do AdminBookingForm e da Proposta Rápida).
const toLocalInput = (iso: string | undefined | null): string => {
  const d = new Date(iso || '');
  if (!iso || Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export interface ProposalBaseBooking {
  id: string;
  code: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  briefing: string;
  /** Quantas linhas a reserva tem hoje (salvar troca todas). */
  itemCount: number;
  lockedReason: string | null;
  eventTitle: string;
  location: string;
  eventDate: string;
  eventEndDate: string;
  street: string;
  addressNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

/** Os dados da reserva (GET /bookings/:id) que a Proposta Rápida usa para montar o orçamento dela. */
export function proposalBaseFromBooking(booking: BookingSource): ProposalBaseBooking {
  const id = booking.id ?? '';
  const venue = (booking as { venue?: Partial<Record<'street' | 'addressNumber' | 'neighborhood' | 'city' | 'state' | 'zipCode', string>> }).venue;
  // Auditoria completa (19/11/2026): o briefing sem local grava "A definir" na rua, no bairro e no CEP (NOT_DEFINED). Copiado
  // para a Proposta Rápida, esse texto ia ao servidor como endereço, e o frete podia sair calculado para um lugar errado.
  // "A definir" vira campo vazio: a equipe preenche o endereço de verdade ou deixa o frete a combinar.
  const field = (key: 'street' | 'addressNumber' | 'neighborhood' | 'city' | 'state' | 'zipCode'): string => {
    const value = (booking[key] || venue?.[key] || '').trim();
    return value.toLocaleLowerCase('pt-BR') === NOT_DEFINED.toLocaleLowerCase('pt-BR') ? '' : value;
  };
  return {
    id,
    code: id.startsWith('XP-') ? id : `#${formatBookingCode(id)}`,
    clientName: booking.client?.name || booking.client?.user?.name || booking.clientName || 'Cliente sem nome',
    clientPhone: bookingPhone(booking) || '',
    clientEmail: bookingEmail(booking) || '',
    briefing: booking.specialRequests?.trim() || '',
    itemCount: booking.items?.length ?? 0,
    lockedReason: itemsLockedReason(booking),
    eventTitle: booking.eventTitle || '',
    location: booking.location || booking.eventLocation || '',
    eventDate: toLocalInput(booking.eventDate),
    eventEndDate: toLocalInput(booking.eventEndDate || booking.eventDate),
    street: field('street'),
    addressNumber: field('addressNumber'),
    neighborhood: field('neighborhood'),
    city: field('city'),
    state: field('state'),
    zipCode: field('zipCode'),
  };
}
