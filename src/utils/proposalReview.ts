// Proposta Rápida: "Fechar no valor" e a conferência antes de enviar (pedido de Alyson de 24/11/2026). Tudo aqui é conta
// e regra fixa, sem IA: o modelo de linguagem erra conta, e a soma tem de bater no centavo.

const cents = (value: number) => Math.round(value * 100);

export interface TargetLine {
  id: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  /** Linha posta pelo botão Frete (frete, pedágio): entra no total como está, sem desconto. */
  freight?: boolean;
}

export type TargetResult =
  | { ok: true; discounts: Record<string, number> }
  | { ok: false; reason: string };

const brl = (valueCents: number) =>
  (valueCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Distribui o desconto para o total da proposta ficar exatamente no valor pedido. O desconto é proporcional ao preço
 * de tabela de cada linha (o PDF mostra o preço de tabela riscado e o desconto de cada uma); frete e pedágio ficam como
 * estão. O resto dos centavos vai para as linhas com a maior fração, para a soma bater no centavo. Nunca sobe o preço
 * acima da tabela: para cobrar mais, a equipe digita o preço da linha.
 */
export function distributeTargetTotal(lines: TargetLine[], targetCents: number): TargetResult {
  if (!Number.isInteger(targetCents) || targetCents <= 0) return { ok: false, reason: 'Digite um valor maior que zero.' };
  const gross = (line: TargetLine) => Math.max(0, cents(line.unitPrice)) * Math.max(1, line.quantity);
  const eligible = lines.filter((line) => !line.freight && gross(line) > 0);
  const fixedCents = lines.filter((line) => !eligible.includes(line)).reduce((sum, line) => sum + Math.max(0, cents(line.totalPrice)), 0);
  const eligibleGross = eligible.reduce((sum, line) => sum + gross(line), 0);
  if (eligible.length === 0) return { ok: false, reason: 'A proposta não tem itens com preço para receber o desconto.' };
  if (targetCents < fixedCents) return { ok: false, reason: `O valor é menor que o frete e o pedágio da proposta (${brl(fixedCents)}).` };
  if (targetCents > fixedCents + eligibleGross) {
    return { ok: false, reason: `O valor passa do preço de tabela (${brl(fixedCents + eligibleGross)}). Para cobrar mais, digite o preço da linha.` };
  }
  const discountCents = fixedCents + eligibleGross - targetCents;
  const shares = eligible.map((line) => {
    const exact = (discountCents * gross(line)) / eligibleGross;
    return { line, base: Math.floor(exact), fraction: exact - Math.floor(exact) };
  });
  let rest = discountCents - shares.reduce((sum, s) => sum + s.base, 0);
  for (const share of [...shares].sort((a, b) => b.fraction - a.fraction)) {
    if (rest <= 0) break;
    if (share.base < gross(share.line)) {
      share.base += 1;
      rest -= 1;
    }
  }
  return { ok: true, discounts: Object.fromEntries(shares.map((s) => [s.line.id, s.base / 100])) };
}

/** "R$ 1.234,56", "1234,56", "1.234" ou "1234.56" em centavos; null quando não é um valor. */
export function parseMoneyInput(raw: string): number | null {
  const text = raw.replace(/r\$\s*/i, '').trim();
  if (!text) return null;
  const normalized = text.includes(',')
    ? text.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(text) ? text.replace(/\./g, '') : text;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

// ===== Conferência =====

const BRIEFING_MARK = '— Briefing preenchido pelo cliente —';

/** A resposta do briefing (texto gravado pelo buildBriefingText) para um rótulo, ou '' quando não há. */
export function briefingAnswerOf(briefing: string | null | undefined, label: string): string {
  const lines = (briefing ?? '').split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === BRIEFING_MARK);
  if (start < 0) return '';
  for (const line of lines.slice(start + 1)) {
    const text = line.trim();
    if (!text || text.startsWith('— ')) break;
    if (text.startsWith(`${label}:`)) return text.slice(label.length + 1).trim();
  }
  return '';
}

export interface SameDayBooking {
  id: string;
  eventDate?: string | null;
  eventEndDate?: string | null;
  status?: string | null;
  clientName?: string | null;
  eventTitle?: string | null;
  client?: { user?: { name?: string | null } | null } | null;
}

export interface ReviewInput {
  briefing?: string | null;
  clientName: string;
  lines: TargetLine[];
  subtotal: number;
  /** O valor em que a proposta foi fechada ("Fechar no valor"), em centavos. */
  closedTargetCents?: number | null;
  eventStart?: string;
  eventEnd?: string;
  sameDay?: SameDayBooking[];
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'rascunho', PENDING: 'pendente', CONFIRMED: 'confirmada', IN_PROGRESS: 'em andamento', COMPLETED: 'concluída',
};
const hourOf = (iso?: string | null) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
    : '';
};
const overlaps = (aStart?: string, aEnd?: string, bStart?: string | null, bEnd?: string | null) => {
  const [s1, e1, s2, e2] = [aStart, aEnd, bStart, bEnd].map((v) => (v ? new Date(v).getTime() : NaN));
  return [s1, e1, s2, e2].every(Number.isFinite) && s1 < e2 && s2 < e1;
};

export const SUSPICIOUS_DISCOUNT = 0.5;
export const SUSPICIOUS_TOTAL_CENTS = 10_000;

/** Os alertas da conferência antes de enviar: o que falta no briefing, outra reserva no dia e valor que parece erro. */
export function proposalAlerts(input: ReviewInput): string[] {
  const alerts: string[] = [];
  const answer = (label: string) => briefingAnswerOf(input.briefing, label);

  if (!input.clientName.trim()) alerts.push('Sem o nome do cliente.');

  // O que o cliente não soube responder (vira "a confirmar" no PDF quando cabe).
  if (answer('Horário') === 'A confirmar') alerts.push('O cliente não sabia o horário: confirme o início e o término.');
  if (answer('Tensão da tomada') === 'Não sei') alerts.push('Tensão da tomada (110V ou 220V) a confirmar com o cliente.');
  const rider = answer('A banda tem rider técnico');
  if (rider === 'Sim') alerts.push('A banda tem rider técnico: peça o rider antes do evento.');
  if (rider === 'Não sei') alerts.push('Confirme se a banda tem rider técnico.');
  const soundLimit = answer('O local tem horário limite para som');
  if (soundLimit === 'Sim') alerts.push('O local tem horário limite para som: confirme o horário com o cliente.');
  if (soundLimit === 'Não sei') alerts.push('Horário limite de som do local a confirmar.');
  if (answer('Durante o evento') === 'Não sei') alerts.push('Confirme se o cliente quer técnico durante o evento ou montar e buscar depois.');
  if (['Não', 'Não sei'].includes(answer('Tem proteção em caso de chuva'))) alerts.push('Evento ao ar livre sem proteção de chuva confirmada.');

  // Valor que parece erro de digitação.
  const gross = input.lines.filter((l) => !l.freight).reduce((sum, l) => sum + Math.max(0, cents(l.unitPrice)) * Math.max(1, l.quantity), 0);
  const net = input.lines.filter((l) => !l.freight).reduce((sum, l) => sum + Math.max(0, cents(l.totalPrice)), 0);
  if (gross > 0 && net < gross * (1 - SUSPICIOUS_DISCOUNT)) {
    alerts.push(`Desconto de ${Math.round((1 - net / gross) * 100)}% sobre o preço de tabela: confira se o valor está certo.`);
  }
  const subtotalCents = cents(input.subtotal);
  if (input.lines.length > 0 && subtotalCents > 0 && subtotalCents < SUSPICIOUS_TOTAL_CENTS) {
    alerts.push(`Total de ${brl(subtotalCents)}: confira se não faltou um zero.`);
  }
  if (input.closedTargetCents != null && subtotalCents !== input.closedTargetCents) {
    alerts.push(`O total mudou depois de fechar em ${brl(input.closedTargetCents)} (agora ${brl(subtotalCents)}): feche de novo ou confira.`);
  }

  // Outra reserva no mesmo dia.
  for (const other of input.sameDay ?? []) {
    const who = other.clientName || other.client?.user?.name || other.eventTitle || 'sem nome';
    const when = [hourOf(other.eventDate), hourOf(other.eventEndDate)].filter(Boolean).join('–');
    const status = STATUS_LABEL[String(other.status)] ?? String(other.status ?? '').toLowerCase();
    const sameTime = overlaps(input.eventStart, input.eventEnd, other.eventDate, other.eventEndDate);
    alerts.push(`${sameTime ? 'Outra reserva no mesmo horário' : 'Outra reserva no mesmo dia'}: ${other.id}, ${who}${when ? `, ${when}` : ''} (${status}). Confira equipe e equipamentos.`);
  }
  return alerts;
}
