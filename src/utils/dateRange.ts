// Filtro de período a partir de <input type="date"> ('AAAA-MM-DD'). new Date('2026-10-31') é
// meia-noite UTC — no Brasil, 21h do dia anterior —, o que tirava do período os eventos do último
// dia e punha os da noite anterior ao primeiro. Aqui os limites são o dia LOCAL inteiro.
export function isWithinLocalDateRange(dateIso: string, startDay?: string, endDay?: string): boolean {
  const t = new Date(dateIso).getTime();
  if (startDay && t < new Date(`${startDay}T00:00:00`).getTime()) return false;
  if (endDay && t > new Date(`${endDay}T23:59:59.999`).getTime()) return false;
  return true;
}
