// Importação do histórico (agendas antigas): converte a aba "Eventos" da planilha de revisão em
// linhas para POST /admin/bookings/import-history. Regras combinadas com o usuário:
// - coluna "Importar" = Não → linha ignorada;
// - sem horário → 20:00–23:00; só início → término 3h depois; término ≤ início → dia seguinte;
// - sem valor → "Valor sugerido" com a nota "valor estimado"; sem os dois → R$ 0;
// - Pago / Parcial / Pendente → situação do pagamento; Dúvida, Problema, Não marcado → só nota.
// Horário de Brasília fixo (-03:00): o Brasil não tem horário de verão desde 2019.

export type HistorySheetRow = Record<string, unknown>;

export interface HistoryImportRow {
  key: string;
  eventDate: string;
  eventEndDate: string;
  setupTime?: string;
  clientName: string;
  eventTitle?: string;
  location?: string;
  totalPrice: number;
  paymentStatus?: 'PAID' | 'PARTIAL' | 'PENDING' | null;
  notes?: string;
  internalNotes?: string;
}

export interface ParsedHistoryRow {
  /** Linha na planilha (cabeçalho = 1). */
  line: number;
  key: string;
  date: string;
  client: string;
  row?: HistoryImportRow;
  errors: string[];
}

export const HISTORY_SHEET = 'Eventos';
export const DEFAULT_START = '20:00';
export const DEFAULT_END = '23:00';
const DEFAULT_DURATION_MIN = 180;
const OFFSET = '-03:00';

const PAYMENT: Record<string, HistoryImportRow['paymentStatus']> = {
  pago: 'PAID',
  parcial: 'PARTIAL',
  pendente: 'PENDING',
};

const text = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
const pad = (n: number) => String(n).padStart(2, '0');
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Data: texto dd/mm/aaaa (como a planilha foi gerada) ou número de série do Excel (se alguém
// redigitar a célula e o Excel converter). Devolve AAAA-MM-DD.
export function parseSheetDate(v: unknown): string | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 864e5);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const m = text(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

// Hora: "20:00", "20h", "20h30" ou fração de dia do Excel. Devolve minutos desde 00:00.
export function parseSheetTime(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    const minutes = Math.round((v - Math.floor(v)) * 1440) % 1440;
    return minutes;
  }
  const m = text(v).toLowerCase().match(/^(\d{1,2})(?::|h)?(\d{2})?(?::\d{2})?h?$/);
  if (!m) return null;
  const [h, min] = [Number(m[1]), Number(m[2] || 0)];
  return h < 24 && min < 60 ? h * 60 + min : null;
}

// Valor: número, "500", "1.150,00" ou "R$ 1.150,00".
export function parseSheetMoney(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = text(v).replace(/r\$\s*/i, '');
  if (!s) return null;
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

const atLocal = (date: string, minutes: number) => new Date(`${date}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00${OFFSET}`);
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function parseHistoryRows(rows: HistorySheetRow[]): { rows: ParsedHistoryRow[]; skipped: number } {
  const parsed: ParsedHistoryRow[] = [];
  let skipped = 0;

  rows.forEach((r, i) => {
    const line = i + 2;
    if (['nao', 'n', 'no'].includes(fold(text(r['Importar'])))) {
      skipped++;
      return;
    }
    const key = text(r['Código']);
    const client = text(r['Cliente']);
    const date = parseSheetDate(r['Data']);
    const errors: string[] = [];
    if (!key) errors.push('Código vazio');
    if (!client) errors.push('Cliente vazio');
    if (!date) errors.push(`Data inválida ("${text(r['Data'])}") — use dd/mm/aaaa`);

    const rawStart = text(r['Início']);
    const rawEnd = text(r['Término']);
    const rawSetup = text(r['Montagem']);
    const start = rawStart ? parseSheetTime(r['Início']) : null;
    const end = rawEnd ? parseSheetTime(r['Término']) : null;
    const setup = rawSetup ? parseSheetTime(r['Montagem']) : null;
    if (rawStart && start === null) errors.push(`Início inválido ("${rawStart}")`);
    if (rawEnd && end === null) errors.push(`Término inválido ("${rawEnd}")`);
    if (rawSetup && setup === null) errors.push(`Montagem inválida ("${rawSetup}")`);

    const rawValue = text(r['Valor (R$)']);
    const value = rawValue ? parseSheetMoney(r['Valor (R$)']) : null;
    const suggested = parseSheetMoney(r['Valor sugerido (R$)']);
    if (rawValue && value === null) errors.push(`Valor inválido ("${rawValue}")`);
    if (value !== null && value < 0) errors.push('Valor negativo');

    const display = { line, key, date: text(r['Data']), client };
    if (errors.length || !date) {
      parsed.push({ ...display, errors });
      return;
    }

    const notesForAdmin: string[] = [`Importado da agenda ${text(r['Origem']) || 'antiga'} (${key}).`];
    const team = text(r['Equipe']);
    if (team) notesForAdmin.push(`Equipe: ${team}`);

    // Horário
    let startMin = start;
    let endMin = end;
    if (startMin === null && endMin === null) {
      startMin = parseSheetTime(DEFAULT_START) as number;
      endMin = parseSheetTime(DEFAULT_END) as number;
      notesForAdmin.push(`Horário não informado na agenda — registrado ${DEFAULT_START}–${DEFAULT_END}.`);
    } else if (startMin === null) {
      startMin = ((endMin as number) - DEFAULT_DURATION_MIN + 1440) % 1440;
      notesForAdmin.push('Início não informado na agenda — estimado 3h antes do término.');
    } else if (endMin === null) {
      endMin = (startMin + DEFAULT_DURATION_MIN) % 1440;
      notesForAdmin.push('Término não informado na agenda — estimado 3h após o início.');
    }
    const eventDate = atLocal(date, startMin);
    let eventEndDate = atLocal(date, endMin as number);
    if (eventEndDate <= eventDate) eventEndDate = new Date(eventEndDate.getTime() + 864e5); // passa da meia-noite
    let setupTime: Date | undefined;
    if (setup !== null) {
      setupTime = atLocal(date, setup);
      if (setupTime > eventDate) setupTime = new Date(setupTime.getTime() - 864e5); // montagem na véspera
    }

    // Valor
    let totalPrice = value ?? 0;
    if (value === null && suggested !== null) {
      totalPrice = suggested;
      notesForAdmin.push(`Valor estimado: ${brl(suggested)} — não anotado na agenda; sugestão pelo valor mais comum do cliente nos 12 meses anteriores. Confirmar.`);
    } else if (value === null) {
      notesForAdmin.push('Valor não anotado na agenda.');
    }

    // Pagamento
    const payment = text(r['Pagamento']);
    const paymentStatus = PAYMENT[fold(payment)] ?? null;
    if (payment && !paymentStatus) notesForAdmin.push(`Pagamento na agenda: ${payment}.`);

    const obs = text(r['Observações']);
    if (obs) notesForAdmin.push(`Observações: ${obs}`);
    const original = text(r['Texto original']);
    if (original) notesForAdmin.push(`Texto original da agenda:\n${original}`);

    parsed.push({
      ...display,
      errors: [],
      row: {
        key,
        eventDate: eventDate.toISOString(),
        eventEndDate: eventEndDate.toISOString(),
        ...(setupTime ? { setupTime: setupTime.toISOString() } : {}),
        clientName: client,
        ...(text(r['Evento']) ? { eventTitle: text(r['Evento']) } : {}),
        ...(text(r['Local']) ? { location: text(r['Local']) } : {}),
        totalPrice,
        paymentStatus,
        ...(text(r['Detalhes']) ? { notes: text(r['Detalhes']) } : {}),
        internalNotes: notesForAdmin.join('\n'),
      },
    });
  });

  return { rows: parsed, skipped };
}

// Lê a aba "Eventos" do .xlsx (biblioteca carregada só aqui). raw: datas/horas redigitadas no
// Excel chegam como número de série — o texto formatado dependeria do formato da célula.
export async function readHistoryWorkbook(file: File): Promise<HistorySheetRow[]> {
  const XLSX = await import('xlsx-js-style');
  const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = book.Sheets[HISTORY_SHEET];
  if (!sheet) throw new Error(`A planilha não tem a aba "${HISTORY_SHEET}".`);
  return XLSX.utils.sheet_to_json<HistorySheetRow>(sheet, { raw: true, defval: '' });
}
