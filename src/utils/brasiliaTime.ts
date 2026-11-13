// Auditoria do orçamento (12/11/2026), fuso: o horário do evento é o de Brasília (America/Sao_Paulo), onde o evento
// acontece, e não o do aparelho de quem preenche. Antes, o /orcamento e o briefing montavam o início e o término no fuso
// do navegador: um cliente em Lisboa que digitava "19:00" pedia o evento às 15:00 de Brasília. Agora o mesmo "19:00" vira
// o mesmo instante em qualquer aparelho. Helper único do site para "data + hora de Brasília"; as contas não dependem do
// fuso do processo (o Intl recebe o fuso explícito).

export const BRASILIA_TIME_ZONE = 'America/Sao_Paulo';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: BRASILIA_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export interface BrasiliaParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Ano, mês, dia, hora, minuto e segundo do instante no relógio de Brasília. */
export function brasiliaParts(value: Date): BrasiliaParts {
  const parts = PARTS.formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? NaN);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24, minute: get('minute'), second: get('second') };
}

/** Quanto o relógio de Brasília está à frente do UTC no instante (−3 h hoje; o Brasil não tem horário de verão desde 2019). */
function offsetMs(instant: number): number {
  const p = brasiliaParts(new Date(instant));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(instant / 1000) * 1000;
}

/** O instante de "AAAA-MM-DD" às "HH:mm" no horário de Brasília; null com data ou hora inválida (31/02, 25:00). */
export function brasiliaDateTime(date: string, time: string): Date | null {
  const d = DATE_RE.exec(date);
  const t = TIME_RE.exec(time);
  if (!d || !t) return null;
  const [year, month, day] = [Number(d[1]), Number(d[2]), Number(d[3])];
  const wall = Date.UTC(year, month - 1, day, Number(t[1]), Number(t[2]));
  const check = new Date(wall);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  // Duas passadas: a segunda acerta a hora se o fuso mudasse entre o palpite e o instante (horário de verão).
  const first = wall - offsetMs(wall);
  return new Date(wall - offsetMs(first));
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "AAAA-MM-DD" do dia em Brasília (hoje, por padrão). */
export function brasiliaDateISO(value: Date = new Date()): string {
  const p = brasiliaParts(value);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** O dia seguinte de "AAAA-MM-DD", no calendário (a festa que acaba às 2h termina no dia seguinte). */
export function nextDateISO(date: string): string {
  const d = DATE_RE.exec(date);
  if (!d) return date;
  const next = new Date(Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]) + 1));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}
