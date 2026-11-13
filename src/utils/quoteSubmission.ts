import { brasiliaDateISO, brasiliaDateTime, brasiliaParts, nextDateISO } from './brasiliaTime';

// Mensagem de sucesso do envio de orçamento (QuoteRequestPage). No checkout de convidado
// com e-mail que já tem conta, o backend aceita o pedido nessa conta mas não autentica
// ninguém (`existingAccount: true`) — a pessoa precisa entrar para acompanhar o pedido.
export function quoteSuccessMessage(responseData: { existingAccount?: boolean; [key: string]: unknown } | null | undefined): string {
  return responseData?.existingAccount
    ? 'Seu pedido de orçamento foi enviado! Este e-mail já tem cadastro: entre na sua conta para acompanhar o pedido.'
    : 'Seu pedido de orçamento foi enviado com sucesso.';
}

// Auditoria do orçamento (12/11/2026), O6: o /orcamento pede o início e o término do evento, como o briefing, e a hora
// da montagem num campo à parte. Antes a "Hora de Início da Montagem" virava o início do evento e o "Tempo de Operação"
// a duração: montagem às 15h e festa das 19h às 23h gravava o evento das 15h às 19h, ou cobrava 4 h a mais de kit e 8 h
// de técnico. Horário de Brasília, como no briefing (auditoria do orçamento, 12/11/2026, fuso: antes era o do aparelho,
// e quem pedia de outro fuso gravava outra hora; ver utils/brasiliaTime.ts). Término antes do início (ou igual a ele,
// não) é a madrugada do dia seguinte: a festa que acaba às 2h. Evento (ou aluguel por diária) de mais de um dia: a data
// do término, opcional, leva o término para esse dia (antes, o "Tempo de Operação" aceitava 30 h ou 48 h).

export interface QuoteTimesInput {
  eventDate?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  /** Data do término: só no evento de mais de um dia. Em branco (ou igual à data do evento), o término é no mesmo dia. */
  endDate?: unknown;
  setupTime?: unknown;
}

export interface QuoteEventRange {
  start: Date;
  end: Date;
  /** Horas do evento, sem arredondar (as contas arredondam para cima, como o servidor). */
  hours: number;
  /** Hora da montagem no dia do evento; null sem ela. */
  setup: Date | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Data e hora no horário de Brasília (inválida vira Invalid Date, que as contas abaixo recusam).
const brasiliaDate = (date: string, time: string): Date => brasiliaDateTime(date, time) ?? new Date(Number.NaN);

const textOf = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** A data do término é de outro dia: depois da data do evento ('after'), antes dela ('before'); 'none' sem ela. */
export function quoteEndDateKind(input: QuoteTimesInput): 'none' | 'after' | 'before' {
  const date = textOf(input.eventDate);
  const endDate = textOf(input.endDate);
  if (!DATE_RE.test(date) || !DATE_RE.test(endDate) || endDate === date) return 'none';
  return endDate > date ? 'after' : 'before';
}

/**
 * Início, término e montagem pelas respostas; null enquanto falta a data, o início ou o término (ou são iguais, no
 * mesmo dia), ou quando a data do término é antes da data do evento.
 */
export function quoteEventRange(input: QuoteTimesInput): QuoteEventRange | null {
  const date = textOf(input.eventDate);
  const startTime = textOf(input.startTime);
  const endTime = textOf(input.endTime);
  const endDateKind = quoteEndDateKind(input);
  if (!DATE_RE.test(date) || !TIME_RE.test(startTime) || !TIME_RE.test(endTime) || endDateKind === 'before') return null;
  const multiDay = endDateKind === 'after';
  if (!multiDay && startTime === endTime) return null;
  const start = brasiliaDate(date, startTime);
  let end = brasiliaDate(multiDay ? textOf(input.endDate) : date, endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (!multiDay && end <= start) end = brasiliaDate(nextDateISO(date), endTime);
  const setupTime = textOf(input.setupTime);
  return {
    start,
    end,
    hours: (end.getTime() - start.getTime()) / 3_600_000,
    setup: TIME_RE.test(setupTime) ? brasiliaDate(date, setupTime) : null,
  };
}

/** O fim da linha da duração: "" no mesmo dia, " (termina no dia seguinte)" ou " (termina em 12/01)". Dias de Brasília. */
export function quoteEventEndNote(range: Pick<QuoteEventRange, 'start' | 'end'>): string {
  const start = brasiliaParts(range.start);
  const end = brasiliaParts(range.end);
  const day = (d: typeof start) => Date.UTC(d.year, d.month - 1, d.day);
  const days = Math.round((day(end) - day(start)) / 86_400_000);
  if (days <= 0) return '';
  if (days === 1) return ' (termina no dia seguinte)';
  const p = (n: number) => String(n).padStart(2, '0');
  const year = end.year === start.year ? '' : `/${end.year}`;
  return ` (termina em ${p(end.day)}/${p(end.month)}${year})`;
}

/** "AAAA-MM-DD" de hoje em Brasília (a data do evento é a de lá; antes, a do aparelho). */
export function todayISO(now: Date = new Date()): string {
  return brasiliaDateISO(now);
}

// Auditoria do orçamento (12/11/2026), O25: escada, local coberto e estacionamento sem resposta pré-marcada, com "Não
// sei". O cadastro guarda sim/não (sem migração nesta onda): "Não sei" grava o caso comum, como no briefing, e a resposta
// como a pessoa marcou vai no texto do pedido (specialRequests), que a ficha do painel já mostra.
export type LogisticsAnswer = 'yes' | 'no' | 'unknown';

export const LOGISTICS_ANSWER_LABEL: Record<LogisticsAnswer, string> = { yes: 'Sim', no: 'Não', unknown: 'Não sei' };

export interface QuoteLogisticsAnswers {
  requiresStairs: LogisticsAnswer;
  isCovered: LogisticsAnswer;
  hasParking: LogisticsAnswer;
}

/** Sim/não do cadastro. "Não sei" não afirma nada contra: sem escada, coberto e com estacionamento (o padrão do servidor). */
export function logisticsFlags(answers: QuoteLogisticsAnswers): { requiresStairs: boolean; isCovered: boolean; hasParking: boolean } {
  return {
    requiresStairs: answers.requiresStairs === 'yes',
    isCovered: answers.isCovered !== 'no',
    hasParking: answers.hasParking !== 'no',
  };
}

/** O texto do pedido para a equipe: as respostas da logística como a pessoa marcou e a hora da montagem, quando veio. */
export function quoteRequestText(answers: QuoteLogisticsAnswers & { setupTime?: string | null }): string {
  const lines = [
    '— Pedido de orçamento pelo site —',
    ...(answers.setupTime ? [`Liberado para montar a partir de: ${answers.setupTime}`] : []),
    `Escadas no acesso: ${LOGISTICS_ANSWER_LABEL[answers.requiresStairs]}`,
    `Local coberto: ${LOGISTICS_ANSWER_LABEL[answers.isCovered]}`,
    `Estacionamento ou carga e descarga: ${LOGISTICS_ANSWER_LABEL[answers.hasParking]}`,
  ];
  return lines.join('\n');
}

// Auditoria do orçamento (12/11/2026), O7: o desconto do cupom acompanha o subtotal. A validação devolve a regra do
// cupom (tipo, valor, teto e pedido mínimo) e o site refaz a conta do servidor (computeDiscount em
// backend/src/services/couponService.ts) a cada mudança do subtotal, sem nova consulta: a rota de validação aceita 15
// tentativas em 5 minutos, e revalidar a cada hora digitada esgotaria esse limite (e acordaria o banco a cada tecla).
// Antes do envio o site valida de novo, com o subtotal e o e-mail de agora.
export interface CouponRule {
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderValue: number | null;
}

const finiteOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** A regra da resposta da validação; null quando não veio (servidor anterior) ou veio estranha. */
export function parseCouponRule(raw: unknown): CouponRule | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const value = finiteOrNull(r.discountValue);
  if ((r.discountType !== 'PERCENTAGE' && r.discountType !== 'FIXED') || value === null) return null;
  return { discountType: r.discountType, discountValue: value, maxDiscountAmount: finiteOrNull(r.maxDiscountAmount), minOrderValue: finiteOrNull(r.minOrderValue) };
}

/** Desconto do cupom sobre o subtotal dos itens, com a conta do servidor; belowMinimum quando o pedido mínimo não é atingido. */
export function couponDiscount(rule: CouponRule, subtotal: number): { amount: number; belowMinimum: boolean } {
  if (rule.minOrderValue !== null && subtotal < rule.minOrderValue) return { amount: 0, belowMinimum: true };
  let discount = rule.discountType === 'PERCENTAGE' ? subtotal * (rule.discountValue / 100) : rule.discountValue;
  if (rule.maxDiscountAmount !== null) discount = Math.min(discount, rule.maxDiscountAmount);
  discount = Math.min(discount, subtotal);
  return { amount: Math.max(0, Math.round(discount * 100) / 100), belowMinimum: false };
}

/** WhatsApp com DDD: 10 a 13 dígitos (com ou sem o 55), como o briefing pede. */
export function isWhatsAppWithAreaCode(value: unknown): boolean {
  const digits = textOf(value).replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
}
