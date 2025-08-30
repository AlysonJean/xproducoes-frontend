import React, { useState, useEffect } from 'react';
import { useCollaborators } from '../../hooks';
// import type { IBooking } from '@x-producoes/shared'; // Removido, use tipos centralizados

import type { Booking } from '../../types/types';

interface CalendarDay {
  date: Date;
  bookings: Booking[];
  isCurrentMonth: boolean;
  hasWork: boolean;
}

interface WorkStats {
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  workingDays: number;
}

const CollaboratorWorkSchedule: React.FC = () => {
  const { collaborators } = useCollaborators();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [collaboratorBookings, setCollaboratorBookings] = useState<Booking[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<WorkStats>({
    totalBookings: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    workingDays: 0,
  });

  // Buscar bookings do colaborador
  useEffect(() => {
    const fetchCollaboratorBookings = async () => {
      if (!collaborators[0]) return;

      try {
        const response = await fetch(
          `/api/bookings/collaborator/${collaborators[0].id}?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`
        );
        if (response.ok) {
          const data = await response.json();
          const list = Array.isArray(data) ? data : [];
          setCollaboratorBookings(list);
        }
      } catch {}
    };

    fetchCollaboratorBookings();
  }, [collaborators[0], currentDate]);

  useEffect(() => {
    const generateCalendar = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const firstDay = new Date(year, month, 1);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());

      const days: CalendarDay[] = [];
      const current = new Date(startDate);

      for (let i = 0; i < 42; i++) {
        const dayBookings = collaboratorBookings.filter((booking) => {
          const bookingDate = booking.eventDate ? new Date(booking.eventDate) : null;
          return bookingDate && bookingDate.toDateString() === current.toDateString();
        });

        days.push({
          date: new Date(current),
          bookings: dayBookings,
          isCurrentMonth: current.getMonth() === month,
          hasWork: dayBookings.length > 0,
        });

        current.setDate(current.getDate() + 1);
      }

      setCalendarDays(days);
    };

    const calculateMonthlyStats = () => {
      const today = new Date();
      const workingDays = new Set();

      const stats = collaboratorBookings.reduce(
        (acc, booking) => {
          if (!booking.eventDate) return acc;
          
          const bookingDate = new Date(booking.eventDate);
          workingDays.add(bookingDate.toDateString());

          if (bookingDate >= today) {
            acc.upcomingBookings++;
          }

          if (booking.status === 'COMPLETED') {
            acc.completedBookings++;
          }

          return acc;
        },
        {
          totalBookings: collaboratorBookings.length,
          upcomingBookings: 0,
          completedBookings: 0,
          workingDays: 0,
        }
      );

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with navigation */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Minha Agenda de Trabalho</h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe seus eventos e compromissos profissionais
            </p>
          </div>

          <div className="flex items-center space-x-4">
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

            <h2 className="text-xl font-semibold text-foreground min-w-[200px] text-center">
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h2>

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
                  className="w-6 h-6 text-purple-600"
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
                <p className="text-2xl font-bold text-purple-600">{monthlyStats.workingDays}</p>
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
      </div>

      {/* Calendar */}
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
                  min-h-[120px] p-2 border-r border-b border cursor-pointer
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
                        {/* Observações do cliente removidas: campo não existe em Booking */}
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
  );
};

export default CollaboratorWorkSchedule;
