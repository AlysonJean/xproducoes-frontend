import React, { useState, useEffect } from 'react';
import type { Booking } from '../../types/types';
import { collaboratorsAPI, collaboratorProfileAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { formatPrice } from '@/utils/formatPrice';

import { CalendarDay, WorkStats } from '@/types/types';

// Componente de Gráfico de Ganhos Mensais usando Recharts
const MonthlyEarningsChart: React.FC<{ monthlyData: Array<{ month: string; earnings: number; events: number }> }> = ({ monthlyData }) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Processar dados para o formato do recharts
  const processedData = monthlyData
    .filter(item => {
      const itemYear = new Date(item.month + '-01').getFullYear();
      return itemYear === selectedYear;
    })
    .map(item => {
      const date = new Date(item.month + '-01');
      return {
        month: date.getMonth() + 1,
        label: date.toLocaleDateString('pt-BR', { month: 'short' }),
        earnings: item.earnings,
        events: item.events
      };
    });

  // Anos disponíveis nos dados
  const availableYears = Array.from(
    new Set(monthlyData.map(item => new Date(item.month + '-01').getFullYear()))
  ).sort((a, b) => b - a);

  if (!monthlyData || monthlyData.length === 0) {
    return (
      <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-4">Ganhos Mensais</h3>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Ganhos Mensais</h3>

        {availableYears.length > 1 && (
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            aria-label="Selecionar ano para gráfico de ganhos"
            title="Selecionar ano"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        )}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              className="text-xs fill-muted-foreground"
            />
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
              className="text-xs fill-muted-foreground"
            />
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => [
                name === 'earnings'
                  ? formatPrice(Number(value || 0))
                  : (value || 0),
                name === 'earnings' ? 'Ganhos' : 'Eventos'
              ]}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Bar
              dataKey="earnings"
              name="earnings"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              className="hover:opacity-80 transition-opacity"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between mt-4 text-xs text-muted-foreground">
        <span>Mês</span>
        <span>Ganhos (R$)</span>
      </div>
    </div>
  );
};

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
  // const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // setLoading(true);
        // Buscar dados do dashboard (ganhos)
        const dashboardResponse = await collaboratorsAPI.getMyDashboard();
        const dashboardData = dashboardResponse.data?.data ?? dashboardResponse.data;

        if (dashboardData?.monthlyEarnings) {
          setMonthlyEarnings(dashboardData.monthlyEarnings);
        }

        // Buscar todos os eventos (agenda) via endpoint específico
        const eventsResponse = await collaboratorProfileAPI.getMyEvents(); // Usando a nova função adicionada
        const eventsData = eventsResponse.data?.data ?? eventsResponse.data;
        
        if (Array.isArray(eventsData)) {
            // O backend retorna EventCollaborator[], precisamos extrair o booking
            // e garantir que o objeto resultante tenha o formato Booking esperado
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const bookings = eventsData.map((item: any) => {
                // Se item já for booking (caso endpoint mude), usa item.
                // Se for EventCollaborator, usa item.booking
                const booking = item.booking || item; 
                // Adiciona id do assignment se necessário, mas Booking geralmente tem ID próprio
                return booking; 
            });
            setCollaboratorBookings(bookings);
        }

      } catch (error) {
        console.error('Erro ao buscar dados da agenda:', error);
      } finally {
        // setLoading(false);
      }
    };

    fetchData();
  }, []);

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
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-success';
      case 'CONFIRMED':
        return 'bg-primary';
      case 'PENDING':
        return 'bg-warning';
      case 'DRAFT':
        return 'bg-muted';
      case 'CANCELLED':
        return 'bg-destructive';
      default:
        return 'bg-muted';
    }
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const today = new Date();

  return (
    <CollaboratorLayout 
      title="Agenda de Trabalho"
      breadcrumbs={[
        { name: 'Colaborador', href: '/collaborator' },
        { name: 'Agenda' }
      ]}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Navegação de Mês e Ano */}
            <div className="flex items-center space-x-2">
              <select
                value={currentDate.getMonth()}
                onChange={(e) => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(parseInt(e.target.value));
                  setCurrentDate(newDate);
                }}
                className="px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                title="Selecionar mês"
                aria-label="Selecionar mês"
              >
                {[
                  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                ].map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>

              <select
                value={currentDate.getFullYear()}
                onChange={(e) => {
                  const newDate = new Date(currentDate);
                  newDate.setFullYear(parseInt(e.target.value));
                  setCurrentDate(newDate);
                }}
                className="px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                title="Selecionar ano"
                aria-label="Selecionar ano"
              >
                {Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - 5 + i).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 text-muted-foreground hover:text-card-foreground transition-colors"
                title="Mês anterior"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <button
                onClick={() => navigateMonth('next')}
                className="p-2 text-muted-foreground hover:text-card-foreground transition-colors"
                title="Próximo mês"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-primary/10 rounded-lg">
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Eventos do Mês</p>
                <p className="text-2xl font-bold text-foreground">{monthlyStats.totalBookings}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-success/10 rounded-lg">
                <svg
                  className="w-6 h-6 text-success"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Próximos Eventos</p>
                <p className="text-2xl font-bold text-success">
                  {monthlyStats.upcomingBookings}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-accent rounded-lg">
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Dias de Trabalho</p>
                <p className="text-2xl font-bold text-indigo-600">{monthlyStats.workingDays}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Concluídos</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {monthlyStats.completedBookings}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Ganhos Mensais */}
        <div className="mb-8">
          <MonthlyEarningsChart monthlyData={monthlyEarnings} />
        </div>

        {/* Layout em Grid: Calendário e Lista lado a lado */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Calendário */}
          <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 bg-muted">
              {weekDays.map((day) => (
                <div key={day} className="p-4 text-center text-sm font-medium text-card-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => {
                const isToday = day.date.toDateString() === today.toDateString();
                const hasEvents = day.bookings.length > 0;

                return (
                  <div
                    key={index}
                    className={`
                      min-h-[100px] p-2 border-r border-b border cursor-pointer
                      hover:bg-muted transition-colors
                      ${!day.isCurrentMonth ? 'bg-muted text-muted-foreground' : ''}
                      ${isToday ? 'bg-primary/10' : ''}
                    `}
                    onClick={() => setSelectedDay(day)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`
                        text-sm font-medium
                        ${isToday ? 'bg-blue-600 text-white px-2 py-1 rounded-full' : ''}
                        ${day.isCurrentMonth ? 'text-foreground' : ''}
                      `}
                      >
                        {day.date.getDate()}
                      </span>

                      {hasEvents && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {day.bookings.length}
                        </span>
                      )}
                    </div>

                    {/* Events preview */}
                    <div className="space-y-1">
                      {day.bookings.slice(0, 2).map((booking, bookingIndex) => {
                        const status = booking.status ?? '';
                        return (
                          <div
                            key={bookingIndex}
                            className={`
                              text-xs p-1 rounded truncate text-white
                              ${getBookingStatusColor(status)}
                            `}
                            title={`${booking.client?.name || 'Cliente'} - ${status}`}
                          >
                            {booking.client?.name || 'Evento'}
                          </div>
                        );
                      })}

                      {day.bookings.length > 2 && (
                        <div className="text-xs text-muted-foreground">+{day.bookings.length - 2} mais</div>
                      )}
                    </div>

                    {/* Working day indicator */}
                    {day.hasWork && (
                      <div className="mt-2 text-xs font-medium text-primary">Dia de trabalho</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lista de Eventos */}
          <div className="bg-card rounded-xl p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Eventos em Lista</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {collaboratorBookings.map((booking) => (
                <div key={booking.id} className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${getBookingStatusColor(booking.status ?? '')}`}
                      ></div>
                      <span className="font-medium text-foreground">
                        {booking.client?.name || 'Evento'}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        booking.status === 'COMPLETED'
                          ? 'bg-success/10 text-success'
                          : booking.status === 'CONFIRMED'
                            ? 'bg-primary/10 text-primary'
                            : booking.status === 'PENDING'
                              ? 'bg-warning/10 text-warning'
                              : booking.status === 'CANCELLED'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-muted text-foreground'
                      }`}
                    >
                      {booking.status === 'COMPLETED'
                        ? 'Concluído'
                        : booking.status === 'CONFIRMED'
                          ? 'Confirmado'
                          : booking.status === 'PENDING'
                            ? 'Pendente'
                            : booking.status === 'CANCELLED'
                              ? 'Cancelado'
                              : booking.status === 'DRAFT'
                                ? 'Rascunho'
                                : booking.status}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <span className="font-medium">Data:</span>{' '}
                      {booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('pt-BR') : 'Data não definida'}
                    </p>
                    {typeof booking.venue === 'string' && booking.venue && (
                      <p>
                        <span className="font-medium">Local:</span> {booking.venue}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Day Detail Modal */}
        {selectedDay && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden m-4">
              <div className="px-6 py-4 border-b border">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">
                    {selectedDay.date.toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h3>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="text-muted-foreground hover:text-muted-foreground"
                    title="Fechar"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-96 overflow-y-auto">
                {selectedDay.bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-muted-foreground">Nenhum evento neste dia</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">
                        {selectedDay.bookings.length} evento(s) agendado(s)
                      </h4>
                    </div>

                    {selectedDay.bookings.map((booking, index) => (
                      <div key={index} className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-3 h-3 rounded-full ${getBookingStatusColor(booking.status ?? '')}`}
                            ></div>
                            <span className="font-medium text-foreground">
                              {booking.client?.name || 'Evento'}
                            </span>
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            <span className="font-medium">Data:</span>{' '}
                            {booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('pt-BR') : 'Data não definida'}
                          </p>
                          {booking.eventDate && (
                            <p>
                              <span className="font-medium">Data final:</span>{' '}
                              {new Date(booking.eventDate).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                          {typeof booking.venue === 'string' && booking.venue && (
                            <p>
                              <span className="font-medium">Local:</span> {booking.venue}
                            </p>
                          )}
                          <p>
                            <span className="font-medium">Status:</span>{' '}
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                booking.status === 'COMPLETED'
                                  ? 'bg-success/10 text-success'
                                  : booking.status === 'CONFIRMED'
                                    ? 'bg-primary/10 text-primary'
                                    : booking.status === 'PENDING'
                                      ? 'bg-warning/10 text-warning'
                                      : booking.status === 'CANCELLED'
                                        ? 'bg-destructive/10 text-destructive'
                                        : 'bg-muted text-foreground'
                              }`}
                            >
                              {booking.status === 'COMPLETED'
                                ? 'Concluído'
                                : booking.status === 'CONFIRMED'
                                  ? 'Confirmado'
                                  : booking.status === 'PENDING'
                                    ? 'Pendente'
                                    : booking.status === 'CANCELLED'
                                      ? 'Cancelado'
                                      : booking.status === 'DRAFT'
                                        ? 'Rascunho'
                                        : booking.status}
                            </span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </CollaboratorLayout>
  );
};

export default CollaboratorWorkSchedule;