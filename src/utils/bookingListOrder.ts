// Teste do painel de 25/11/2026 (A-16 e M-01): a ordem padrão da lista de Reservas do painel. De hoje em diante, o evento
// mais perto antes; depois os que já passaram, o mais recente antes; sem data, no fim.
type WithEventDate = { eventDate?: string | null };

const eventTime = (booking: WithEventDate): number | null => {
  const time = booking.eventDate ? Date.parse(booking.eventDate) : Number.NaN;
  return Number.isNaN(time) ? null : time;
};

export function upcomingFirst<T extends WithEventDate>(list: T[], now: number): T[] {
  return [...list].sort((a, b) => {
    const ta = eventTime(a);
    const tb = eventTime(b);
    if (ta === null || tb === null) return ta === tb ? 0 : ta === null ? 1 : -1;
    const aNext = ta >= now;
    const bNext = tb >= now;
    if (aNext !== bNext) return aNext ? -1 : 1;
    return aNext ? ta - tb : tb - ta;
  });
}
