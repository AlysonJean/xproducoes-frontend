import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, BarChart3, Clock, ArrowRight } from 'lucide-react';
import type { Booking } from '../../types/types';
import { collaboratorsAPI, collaboratorProfileAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { CollaboratorLoading, CollaboratorError } from '../../components/collaborator/CollaboratorStates';
import { StatsCard, SimpleCard } from '../../components/ui/Cards';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import type { StandardVariant } from '../../components/ui/StandardTypes';
import { formatPrice } from '@/utils/formatPrice';
import { bookingStatusLabel, bookingStatusVariant } from '@/utils/bookingStatus';
import { cn } from '../../utils/cn';

import { CalendarDay, WorkStats } from '@/types/types';
import { logger } from '../../utils/logger';

// "AAAA-MM" → 1º dia do mês no fuso LOCAL. `new Date('AAAA-MM-01')` é meia-noite UTC — no Brasil cai no
// mês anterior (barra com rótulo errado; janeiro ia para o ano anterior no filtro).
const monthStart = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1);
};

const BREADCRUMBS = [
  { name: 'Colaborador', href: '/colaborador/painel' },
  { name: 'Agenda' },
];

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Fundo sólido do status com o texto do mesmo token. Achado (auditoria): os chips usavam `text-white`
// sobre bg-muted (rascunho, branco no cinza claro), bg-warning e bg-primary (prata no tema escuro).
const SOLID_STATUS_CLASS: Record<StandardVariant, string> = {
  primary: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  info: 'bg-info text-info-foreground',
  ghost: 'bg-muted text-foreground border border-border',
  outline: 'bg-card text-foreground border border-border',
};

const solidStatus = (status?: string) => SOLID_STATUS_CLASS[bookingStatusVariant(status)];

// D4: o servidor não manda mais dados do cliente para a equipe; o título vem só do evento.
const bookingTitle = (booking: Booking) => booking.eventTitle || 'Evento';
const eventLocation = (booking: Booking) => {
  const location = (booking as Booking & { location?: string | null }).location;
  return typeof location === 'string' && location.trim() ? location : null;
};

const axisTick = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };

// Componente de Gráfico de Ganhos Mensais usando Recharts
const MonthlyEarningsChart: React.FC<{ monthlyData: Array<{ month: string; earnings: number; events: number }> }> = ({ monthlyData }) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Processar dados para o formato do recharts
  const processedData = monthlyData
    .filter(item => {
      const itemYear = monthStart(item.month).getFullYear();
      return itemYear === selectedYear;
    })
    .map(item => {
      const date = monthStart(item.month);
      return {
        month: date.getMonth() + 1,
        label: date.toLocaleDateString('pt-BR', { month: 'short' }),
        earnings: item.earnings,
        events: item.events
      };
    })
    .sort((a, b) => a.month - b.month);

  // Anos disponíveis nos dados
  const availableYears = Array.from(
    new Set(monthlyData.map(item => monthStart(item.month).getFullYear()))
  ).sort((a, b) => b - a);

  return (
    <SimpleCard
      title="Ganhos mensais"
      headerRight={
        availableYears.length > 1 ? (
          <div className="w-32">
            <Select
              size="sm"
              value={String(selectedYear)}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label="Ano do gráfico de ganhos"
              options={availableYears.map((year) => ({ value: String(year), label: String(year) }))}
            />
          </div>
        ) : undefined
      }
    >
      {!monthlyData || monthlyData.length === 0 || processedData.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">Nenhum ganho registrado.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={processedData} margin={{ top: 20, right: 16, left: 8, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
              <YAxis
                domain={[0, 'auto']}
                tickFormatter={(value: number) => value.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
                axisLine={false}
                tickLine={false}
                tick={axisTick}
              />
              <Tooltip
                formatter={(value: number | undefined, name: string | undefined) => [
                  name === 'earnings'
                    ? formatPrice(Number(value || 0))
                    : (value || 0),
                  name === 'earnings' ? 'Ganhos' : 'Eventos'
                ]}
                cursor={{ fill: 'hsl(var(--muted))' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--card-foreground))',
                }}
              />
              <Bar dataKey="earnings" name="earnings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </SimpleCard>
  );
};

const BookingDetails: React.FC<{ booking: Booking }> = ({ booking }) => (
  <div className="p-4 bg-muted/40 rounded-lg border border-border">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
      <div className="flex items-center gap-3 min-w-0">
        <span className={cn('w-3 h-3 shrink-0 rounded-full', solidStatus(booking.status))} aria-hidden="true" />
        <span className="font-medium text-foreground truncate">{bookingTitle(booking)}</span>
      </div>
      <Badge variant={bookingStatusVariant(booking.status)}>{bookingStatusLabel(booking.status)}</Badge>
    </div>
    <dl className="text-sm text-muted-foreground space-y-1">
      <div className="flex gap-1">
        <dt className="font-medium text-foreground">Data:</dt>
        <dd>{booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('pt-BR') : 'Data não definida'}</dd>
      </div>
      {/* Achado: "Data final" repetia a data de início; agora mostra o término real, se houver. */}
      {booking.eventEndDate && (
        <div className="flex gap-1">
          <dt className="font-medium text-foreground">Término:</dt>
          <dd>{new Date(booking.eventEndDate).toLocaleDateString('pt-BR')}</dd>
        </div>
      )}
      {/* D4: "venue" não existia na reserva (o local nunca aparecia); o campo é location. */}
      {eventLocation(booking) && (
        <div className="flex gap-1">
          <dt className="font-medium text-foreground">Local:</dt>
          <dd>{eventLocation(booking)}</dd>
        </div>
      )}
    </dl>
    <Link
      to={`/colaborador/evento/${booking.id}/roadmap`}
      className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
    >
      Ver roteiro do evento <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  </div>
);

const CollaboratorWorkSchedule: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [collaboratorBookings, setCollaboratorBookings] = useState<Booking[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<WorkStats>({
    totalBookings: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    workingDays: 0,
    totalRevenue: 0,
    averageRating: 0,
  });
  const [monthlyEarnings, setMonthlyEarnings] = useState<Array<{ month: string; earnings: number; events: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      // Buscar dados do dashboard (ganhos)
      const dashboardResponse = await collaboratorsAPI.getMyDashboard();
      const dashboardData = dashboardResponse.data?.data ?? dashboardResponse.data;

      if (dashboardData?.monthlyEarnings) {
        setMonthlyEarnings(dashboardData.monthlyEarnings);
      }

      // Buscar todos os eventos (agenda) via endpoint específico
      const eventsResponse = await collaboratorProfileAPI.getMyEvents();
      const eventsData = eventsResponse.data?.data ?? eventsResponse.data;

      if (Array.isArray(eventsData)) {
        // O backend retorna EventCollaborator[]; extrai o booking (ou usa o item, se já for booking).
        const bookings = (eventsData as Array<{ booking?: Booking } & Partial<Booking>>).map((item) => item.booking || (item as Booking));
        setCollaboratorBookings(bookings);
      }
    } catch (err) {
      logger.error('Erro ao buscar dados da agenda:', 'CollaboratorWorkSchedule', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const generateCalendar = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());

      const endDate = new Date(lastDay);
      endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

      const days: CalendarDay[] = [];
      const current = new Date(startDate);

      while (current <= endDate) {
        const dayBookings = collaboratorBookings.filter(booking => {
          if (!booking.eventDate) return false;
          const bookingDate = new Date(booking.eventDate);
          return bookingDate.toDateString() === current.toDateString();
        });

        days.push({
          date: new Date(current),
          bookings: dayBookings,
          isCurrentMonth: current.getMonth() === month,
          hasWork: dayBookings.length > 0,
          isToday: current.toDateString() === new Date().toDateString(),
        });

        current.setDate(current.getDate() + 1);
      }

      setCalendarDays(days);
    };

    const calculateMonthlyStats = () => {
      const workingDays = new Set<string>();
      const stats = collaboratorBookings.reduce(
        (acc, booking) => {
          if (booking.eventDate) {
            const bookingDate = new Date(booking.eventDate);
            if (bookingDate.getMonth() === currentDate.getMonth() &&
                bookingDate.getFullYear() === currentDate.getFullYear()) {
              workingDays.add(bookingDate.toDateString());

              if (booking.status === 'COMPLETED') {
                acc.completedBookings++;
              }
            }
          }
          return acc;
        },
        {
          totalBookings: 0,
          upcomingBookings: 0,
          completedBookings: 0,
          workingDays: 0,
          totalRevenue: 0,
          averageRating: 0,
        }
      );

      const monthBookings = collaboratorBookings.filter(b => {
        if (!b.eventDate) return false;
        const d = new Date(b.eventDate);
        return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
      });

      stats.totalBookings = monthBookings.length;
      stats.upcomingBookings = monthBookings.filter(b => b.status && ['CONFIRMED', 'ASSIGNED'].includes(b.status)).length;
      stats.workingDays = workingDays.size;

      setMonthlyStats(stats);
    };

    generateCalendar();
    calculateMonthlyStats();
  }, [currentDate, collaboratorBookings]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(1);
    newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
    setCurrentDate(newDate);
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const today = new Date();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - 5 + i)
    .map((year) => ({ value: String(year), label: String(year) }));

  return (
    <CollaboratorLayout title="Agenda de Trabalho" breadcrumbs={BREADCRUMBS}>
      {loading ? (
        <CollaboratorLoading label="Carregando sua agenda…" />
      ) : error ? (
        <CollaboratorError message="Não conseguimos carregar seus eventos e ganhos." onRetry={fetchData} />
      ) : (
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Navegação de mês e ano */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-40">
              <Select
                size="sm"
                aria-label="Mês"
                value={String(currentDate.getMonth())}
                options={MONTHS.map((m, index) => ({ value: String(index), label: m }))}
                onChange={(e) => {
                  const newDate = new Date(currentDate);
                  newDate.setDate(1);
                  newDate.setMonth(parseInt(e.target.value));
                  setCurrentDate(newDate);
                }}
              />
            </div>
            <div className="w-28">
              <Select
                size="sm"
                aria-label="Ano"
                value={String(currentDate.getFullYear())}
                options={yearOptions}
                onChange={(e) => {
                  const newDate = new Date(currentDate);
                  newDate.setFullYear(parseInt(e.target.value));
                  setCurrentDate(newDate);
                }}
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')} aria-label="Mês anterior">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')} aria-label="Próximo mês">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Estatísticas do mês */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Eventos do mês" value={monthlyStats.totalBookings} icon={<Calendar className="h-5 w-5" />} />
            <StatsCard title="Próximos eventos" value={monthlyStats.upcomingBookings} icon={<Clock className="h-5 w-5" />} />
            <StatsCard title="Dias de trabalho" value={monthlyStats.workingDays} icon={<BarChart3 className="h-5 w-5" />} />
            <StatsCard title="Concluídos" value={monthlyStats.completedBookings} icon={<CheckCircle2 className="h-5 w-5" />} />
          </div>

          {/* Gráfico de Ganhos Mensais */}
          <MonthlyEarningsChart monthlyData={monthlyEarnings} />

          {/* Calendário e lista lado a lado */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <h2 className="sr-only">Calendário de {MONTHS[currentDate.getMonth()]} de {currentDate.getFullYear()}</h2>
              <div className="grid grid-cols-7 bg-muted" aria-hidden="true">
                {weekDays.map((day) => (
                  <div key={day} className="py-3 text-center text-xs sm:text-sm font-medium text-foreground">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  const isToday = day.date.toDateString() === today.toDateString();
                  const count = day.bookings.length;
                  const label = `${day.date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}${
                    count > 0 ? `, ${count} evento${count > 1 ? 's' : ''}` : ', sem eventos'
                  }`;

                  return (
                    // Achado (auditoria): a célula era um <div onClick> — único acesso ao detalhe do dia,
                    // inacessível por teclado.
                    <button
                      type="button"
                      key={index}
                      onClick={() => setSelectedDay(day)}
                      aria-label={label}
                      className={cn(
                        'min-h-14 sm:min-h-[100px] p-1 sm:p-2 border-r border-b border-border text-left align-top transition-colors hover:bg-muted',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                        !day.isCurrentMonth && 'bg-muted/50 text-muted-foreground',
                        isToday && 'bg-primary/10'
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1 sm:mb-2">
                        <span
                          className={cn(
                            'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm font-medium',
                            isToday ? 'bg-primary text-primary-foreground' : day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {day.date.getDate()}
                        </span>

                        {count > 0 && (
                          <span className="hidden sm:inline-flex text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full" aria-hidden="true">
                            {count}
                          </span>
                        )}
                      </div>

                      {/* Celular: só um ponto por evento; a partir de sm, o nome do evento. */}
                      {count > 0 && (
                        <div className="flex gap-1 sm:hidden" aria-hidden="true">
                          {day.bookings.slice(0, 3).map((booking, i) => (
                            <span key={i} className={cn('h-2 w-2 rounded-full', solidStatus(booking.status))} />
                          ))}
                        </div>
                      )}
                      <div className="hidden sm:block space-y-1" aria-hidden="true">
                        {day.bookings.slice(0, 2).map((booking, bookingIndex) => (
                          <div
                            key={bookingIndex}
                            className={cn('text-xs px-1 py-0.5 rounded truncate', solidStatus(booking.status))}
                          >
                            {bookingTitle(booking)}
                          </div>
                        ))}
                        {count > 2 && (
                          <div className="text-xs text-muted-foreground">+{count - 2} mais</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista de eventos */}
            <SimpleCard title="Todos os eventos">
              {collaboratorBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
                  <p className="text-muted-foreground">Você ainda não foi escalado para nenhum evento.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-1">
                  {collaboratorBookings.map((booking) => (
                    <BookingDetails key={booking.id} booking={booking} />
                  ))}
                </div>
              )}
            </SimpleCard>
          </div>
        </div>
      )}

      {/* Detalhe do dia — antes um modal montado à mão (`bg-black bg-opacity-50`, que não existe no
          Tailwind v4 e deixava o fundo preto sólido; sem Esc, foco preso ou role="dialog"). */}
      <Modal
        isOpen={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        size="lg"
        title={selectedDay
          ? selectedDay.date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          : undefined}
      >
        {selectedDay && (
          selectedDay.bookings.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="text-muted-foreground">Nenhum evento neste dia</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="font-medium text-foreground">
                {selectedDay.bookings.length} evento{selectedDay.bookings.length > 1 ? 's' : ''} agendado{selectedDay.bookings.length > 1 ? 's' : ''}
              </p>
              {selectedDay.bookings.map((booking, index) => (
                <BookingDetails key={booking.id || index} booking={booking} />
              ))}
            </div>
          )
        )}
      </Modal>
    </CollaboratorLayout>
  );
};

export default CollaboratorWorkSchedule;
