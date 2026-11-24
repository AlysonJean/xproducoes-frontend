import { Views, type View } from 'react-big-calendar';
import { addDays, addMonths, addWeeks, endOfWeek, format, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

// Onda 4 da auditoria de 19/11 (F6P1-13): na agenda do painel, as setas andam pela visão. Semana: ±1 semana; dia: ±1 dia; mês e lista:
// ±1 mês (antes, sempre um mês). A busca (calendarRange) já cobre o mês anterior e o seguinte, então andar por semana
// ou dia não pede outra consulta.
export const STEP_LABELS = {
  week: { prev: 'Semana anterior', next: 'Próxima semana' },
  day: { prev: 'Dia anterior', next: 'Próximo dia' },
  month: { prev: 'Mês anterior', next: 'Próximo mês' },
} as const;

export function stepDate(date: Date, view: View, direction: 1 | -1): Date {
  if (view === Views.WEEK) return addWeeks(date, direction);
  if (view === Views.DAY) return addDays(date, direction);
  const month = addMonths(date, direction);
  return new Date(month.getFullYear(), month.getMonth(), 1);
}

export function periodTitle(date: Date, view: View): string {
  if (view === Views.WEEK) {
    const start = startOfWeek(date, { locale: ptBR });
    const end = endOfWeek(date, { locale: ptBR });
    return `${format(start, 'dd MMM', { locale: ptBR })} – ${format(end, 'dd MMM yyyy', { locale: ptBR })}`;
  }
  if (view === Views.DAY) return format(date, "dd 'de' MMMM yyyy", { locale: ptBR });
  return format(date, 'MMMM yyyy', { locale: ptBR });
}

// F6P1-16: o término do evento na janela da reserva: o eventEndDate (o servidor arredonda a duração: 20:00–22:30
// aparecia como 20:00–23:00); sem ele, o início mais a duração.
export function modalEventEnd(booking: { eventDate: string; eventEndDate?: string | null; duration?: number | null }): Date {
  const end = booking.eventEndDate ? new Date(booking.eventEndDate) : null;
  if (end && !Number.isNaN(end.getTime())) return end;
  return new Date(new Date(booking.eventDate).getTime() + (booking.duration || 4) * 3600000);
}

export const brasiliaHour = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
