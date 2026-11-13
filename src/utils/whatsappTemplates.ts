import { formatBrasiliaDate } from './whatsapp';
import { formatBookingCode } from './bookingCode';
import { bookingPricing, formatBRL, type PricedBookingLike } from './bookingPricing';

// P14 e D11 (aprovadas em 02/11/2026): "o WhatsApp ao cliente vira botões 'Enviar no WhatsApp' com texto pronto em
// cada etapa". Os textos que o painel manda ao cliente ficam aqui, um por etapa: recebimento, proposta, confirmação,
// véspera e avaliação (e os avisos de cancelamento e de equipe a caminho). O botão abre o WhatsApp com
// openWhatsAppUntracked (utils/whatsapp), sem o evento de conversão do GA (D7). Datas e horas no horário de Brasília,
// qualquer que seja o fuso do aparelho; o código da reserva inteiro (formatBookingCode); o total pela função de preço
// única (bookingPricing, P16), o mesmo da ficha e da página do cliente.
// Auditoria do orçamento (12/11/2026), E8 e O2/C2 (decisão da dona de 12/11: o cliente visita o link, que mostra sempre
// a reserva atual): saiu a mensagem do "PDF + WhatsApp" ("Segue em PDF a proposta", com o valor total); a proposta vai
// pelo link (proposalWhatsAppText), sem total "parado" que possa divergir dele.

/** O que os textos leem da reserva (a ficha do painel tem tudo isso). */
export interface StageBooking extends PricedBookingLike {
  id: string;
  clientName?: string | null;
  client?: { user?: { name?: string | null } | null } | null;
  eventTitle?: string | null;
  eventDate?: string | Date | null;
  neighborhood?: string | null;
  city?: string | null;
  location?: string | null;
}

const brasiliaTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

const clientFirstName = (b: Pick<StageBooking, 'clientName' | 'client'>) => (b.clientName || b.client?.user?.name || '').trim().split(/\s+/)[0];
const greeting = (b: Pick<StageBooking, 'clientName' | 'client'>) => {
  const name = clientFirstName(b);
  return name ? `Olá, ${name}!` : 'Olá!';
};
const quotedTitle = (b: Pick<StageBooking, 'eventTitle'>) => {
  const title = b.eventTitle?.trim();
  return title ? ` "${title}"` : '';
};
// "20/12/2027, às 22:00" no horário de Brasília; '' sem data válida.
const whenText = (value?: string | Date | null) => {
  const date = formatBrasiliaDate(value);
  return date ? `${date}, às ${brasiliaTime.format(new Date(value as string | Date))}` : '';
};
// "R$ 900,00" pela função de preço única; null quando a reserva ainda não tem valor.
const totalText = (b: PricedBookingLike) => {
  const total = bookingPricing(b).total;
  return total > 0 ? formatBRL(Math.round(total * 100)) : null;
};
const ANSWER_HERE = 'Qualquer dúvida, é só responder esta mensagem.';

/** Recebimento: resposta ao pedido do cliente (PENDING criado pelo site). */
export const requestReceivedWhatsAppText = (b: StageBooking): string => {
  const date = formatBrasiliaDate(b.eventDate);
  return [
    `${greeting(b)} Recebemos seu pedido ${formatBookingCode(b.id)}${date ? `, do evento de ${date}` : ''}.`,
    'Estamos conferindo a disponibilidade e logo mandamos a proposta por aqui.',
    ANSWER_HERE,
  ].join('\n');
};

/**
 * Proposta pronta: o link seguro (/proposta#token=...) e a validade, com a data do evento no horário de Brasília. Sem
 * o total (O2/C2): os itens e o valor de agora estão no link.
 */
export const proposalWhatsAppText = (p: {
  clientName?: string | null;
  eventTitle?: string | null;
  eventDate?: string | Date | null;
  link: string;
  validUntil?: string | Date | null;
}): string => {
  const firstName = p.clientName?.trim().split(/\s+/)[0];
  const title = p.eventTitle?.trim();
  const date = formatBrasiliaDate(p.eventDate);
  const validUntil = formatBrasiliaDate(p.validUntil);
  return [
    `${firstName ? `Olá, ${firstName}!` : 'Olá!'} A proposta ${title ? `do seu evento "${title}"` : 'do seu evento'}${date ? ` (${date})` : ''} está pronta.`,
    `Veja os itens e o valor neste link: ${p.link}`,
    `${validUntil ? `A proposta vale até ${validUntil}. ` : ''}Qualquer dúvida, é só responder esta mensagem.`,
  ].join('\n');
};

/** Confirmação: reserva confirmada, com data, hora e o valor total. */
export const bookingConfirmedWhatsAppText = (b: StageBooking): string => {
  const when = whenText(b.eventDate);
  const total = totalText(b);
  return [
    `${greeting(b)} Sua reserva ${formatBookingCode(b.id)} está confirmada.`,
    when && `Evento${quotedTitle(b)} no dia ${when}.`,
    total && `Valor total: ${total}.`,
    ANSWER_HERE,
  ].filter(Boolean).join('\n');
};

// Local do lembrete: bairro e cidade (o que a página da proposta mostra) ou, sem eles, o nome do local da reserva.
// Nunca a rua nem o número.
const placeText = (b: Pick<StageBooking, 'neighborhood' | 'city' | 'location'>) =>
  [b.neighborhood?.trim(), b.city?.trim()].filter(Boolean).join(', ') || b.location?.trim() || '';

/** Véspera: lembrete do evento, com data e hora de Brasília e o local. */
export const eventReminderWhatsAppText = (b: StageBooking): string => {
  const when = whenText(b.eventDate);
  const place = placeText(b);
  return [
    `${greeting(b)} Passando para lembrar do seu evento${quotedTitle(b)}${when ? `, no dia ${when}` : ''}${place ? `, em ${place}` : ''}.`,
    `Nossa equipe já está se preparando. ${ANSWER_HERE}`,
  ].join('\n');
};

/** Avaliação: o link do Perfil da Empresa no Google, que vem da API (GOOGLE_REVIEW_LINK). */
export const reviewRequestWhatsAppText = (b: StageBooking, reviewLink: string): string =>
  [
    `${greeting(b)} Obrigado por escolher a X Produções para o seu evento${quotedTitle(b)}.`,
    'Se puder, conte como foi numa avaliação no Google. Leva menos de um minuto e ajuda muito o nosso trabalho:',
    reviewLink,
  ].join('\n');

// Avisos que acompanham a troca de status na ficha. Decisão do dono de 08/11/2026: no tom das outras etapas (primeiro
// nome, código sem "#", sem maiúsculas), no lugar dos textos antigos ("foi CANCELADA em nosso sistema", "A CAMINHO").

/** Cancelamento da reserva. */
export const bookingCancelledWhatsAppText = (b: StageBooking): string => {
  const name = clientFirstName(b);
  return [
    `${name ? `Olá, ${name}.` : 'Olá.'} Sua reserva ${formatBookingCode(b.id)} foi cancelada.`,
    'Se quiser remarcar ou tiver alguma dúvida, é só responder esta mensagem.',
  ].join('\n');
};

/** Equipe a caminho do evento. */
export const crewOnTheWayWhatsAppText = (b: StageBooking): string =>
  [`${greeting(b)} Nossa equipe já está a caminho do seu evento${quotedTitle(b)}.`, 'Até já!'].join('\n');
