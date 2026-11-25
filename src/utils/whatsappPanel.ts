// WhatsApp pelo painel (pedido de Alyson de 24/11/2026): limites e formatos da tela /admin/whatsapp.

/** O mesmo limite do servidor (whatsappInbox.MAX_TEXT_LENGTH). */
export const MAX_MESSAGE_LENGTH = 1000;
/** Depois de tantas trocas do QR sem conectar (uns 2 minutos e meio), a tela para e pede para clicar de novo. */
export const QR_MAX_REFRESHES = 6;

const TZ = 'America/Sao_Paulo';
const DAY = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
const SHORT_DAY = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' });
const TIME = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** Hora para hoje; dia e mês para os outros dias (dia de Brasília). */
export function formatWhen(at: number | null, now = Date.now()): string {
  if (!at) return '';
  const date = new Date(at);
  return DAY.format(date) === DAY.format(new Date(now)) ? TIME.format(date) : SHORT_DAY.format(date);
}

/** O mesmo formato do servidor (whatsappPhone.formatWaPhone): "5531988887777" → "(31) 98888-7777". */
export function formatPhoneLabel(digits: string): string {
  const local = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
  const rest = local.slice(2);
  const split = rest.length === 9 ? 5 : 4;
  return `(${local.slice(0, 2)}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}
