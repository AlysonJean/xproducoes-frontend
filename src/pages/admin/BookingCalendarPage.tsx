import { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, type Event, type SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiFetch } from '@/services/api';
import { asArray } from '@/utils/normalize';
import type { Equipment, Kit, BookingStatus, ICollaborator, CalendarBooking } from '@/types/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/Button';

// Tipo centralizado em src/types.ts
// Assuming ManualBookingModal is a shared component, moved to a consistent path
import { ManualBookingModal } from '@/components/modals/ManualBookingModal';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface CalendarEvent extends Event {
  resource: CalendarBooking;
}

const BookingDetailsModal = ({ event, onClose }: { event: CalendarEvent; onClose: () => void }) => {
  const booking = event.resource;
  const fullAddress = booking.venue
    ? [booking.venue.street, booking.venue.city, booking.venue.postalCode]
        .filter(Boolean)
        .join(', ')
    : '';

  const getStatusChipClass = (status: BookingStatus | undefined) => {
    const statusClasses: Record<string, string> = {
      PENDING: 'bg-warning/10 text-warning',
      CONFIRMED: 'bg-success/10 text-success',
      IN_PROGRESS: 'bg-accent/10 text-accent',
      COMPLETED: 'bg-accent/10 text-accent',
      CANCELLED: 'bg-destructive/10 text-destructive',
      DRAFT: 'bg-muted text-muted-foreground',
    };
    return status ? statusClasses[status] || 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground';
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50 p-4">
      <div className="bg-card border rounded-xl p-6 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-foreground">Detalhes da Reserva</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-3xl"
            aria-label="Fechar"
          >
            &times;
          </button>
        </div>
        <div className="space-y-4 text-foreground">
          <p>
            <strong>Cliente:</strong> {booking.client?.name || 'Não informado'}
          </p>
          <p>
            <strong>Contato:</strong> {booking.client?.phone || 'Não informado'}
          </p>
          <p>
            <strong>Status:</strong>{' '}
            <span
              className={`font-semibold px-2 py-1 rounded-full text-xs ${getStatusChipClass(booking.status)}`}
            >
              {booking.status}
            </span>
          </p>
          <p>
            <strong>Data:</strong> {new Date(booking.eventDate).toLocaleString('pt-BR')}
          </p>
          <p>
            <strong>Endereço:</strong> {fullAddress || 'Não informado'}
          </p>
          <div>
            <h3 className="font-semibold mt-4 mb-2">Itens:</h3>
            <ul className="list-disc list-inside text-sm">
              {booking.equipments?.map((eq: Equipment) => (
                <li key={eq.id}>{eq.name}</li>
              ))}
              {booking.kits?.map((kit: Kit) => (
                <li key={kit.id}>Kit: {kit.name}</li>
              ))}
            </ul>
          </div>

          {/* Colaboradores Escalados */}
          {booking.collaborators && booking.collaborators.length > 0 && (
            <div className="mt-4">
              <p className="font-semibold mb-2 text-foreground">Colaboradores Escalados:</p>
              <div className="space-y-2">
                {booking.collaborators.map(
                  (eventCollab: {
                    collaboratorId?: string;
                    collaborator?: ICollaborator & { avatar?: string };
                    role?: string;
                  }) => (
                    <div
                      key={eventCollab.collaborator?.id || eventCollab.collaboratorId}
                      className="flex items-center space-x-3"
                    >
                      <img
                        src={eventCollab.collaborator?.avatar || '/default-avatar.png'}
                        alt={eventCollab.collaborator?.name || 'Colaborador'}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <span className="font-medium text-foreground">
                          {eventCollab.collaborator?.name || 'Nome não disponível'}
                        </span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({eventCollab.role})
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {booking.internalNotes && (
            <p>
              <strong>Observações:</strong> {booking.internalNotes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Modal para mostrar todos os eventos do dia
const DayEventsModal = ({
  events,
  onClose,
  onSelectEvent,
}: {
  events: CalendarEvent[];
  onClose: () => void;
  onSelectEvent: (event: CalendarEvent) => void;
}) => (
  <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50 p-4">
    <div className="bg-card border rounded-xl p-6 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-foreground">Eventos do Dia</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-3xl" aria-label="Fechar">&times;</button>
      </div>
      <div className="space-y-6">
        {events.map((ev: { resource: CalendarBooking }) => {
          const booking = ev.resource;
          const fullAddress = [
            booking.venue?.street,
            booking.venue?.city,
            booking.venue?.postalCode,
          ]
            .filter(Boolean)
            .join(', ');
          const endDate = new Date(
            new Date(booking.eventDate).getTime() + booking.duration * 60 * 60 * 1000
          );
          return (
            <div
              key={booking.id}
              className="bg-muted rounded-lg p-4 shadow mb-2 cursor-pointer hover:bg-muted transition"
              onClick={() => {
                onSelectEvent(ev);
                onClose();
              }}
            >
              <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2">
                <div>
                  <p className="font-bold text-foreground">{booking.client?.name}</p>
                  <p className="text-muted-foreground text-sm">{booking.client?.phone}</p>
                </div>
                <div className="text-sm text-muted-foreground mt-2 md:mt-0">
                  {new Date(booking.eventDate).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  - {endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <p className="text-foreground text-sm mb-1">
                <strong>Endereço:</strong> {fullAddress || 'Não informado'}
              </p>
              <div>
                <span className="font-semibold text-foreground">Itens:</span>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {booking.equipments?.map((eq: Equipment) => (
                    <li key={eq.id}>{eq.name}</li>
                  ))}
                  {booking.kits?.map((kit: Kit) => (
                    <li key={kit.id}>Kit: {kit.name}</li>
                  ))}
                </ul>
              </div>
              {booking.internalNotes && (
                <p className="text-muted-foreground text-xs mt-2">
                  <strong>Obs:</strong> {booking.internalNotes}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// Componente customizado para renderizar eventos com avatares dos colaboradores
const CustomEventComponent = ({ event }: { event: CalendarEvent }) => {
  const booking = event.resource;
  const collaborators = booking.collaborators || [];

  return (
    <div className="custom-event-content">
      <div className="event-title text-xs font-semibold">{booking.client?.name}</div>
      {collaborators.length > 0 && (
        <div className="collaborators-avatars flex -space-x-1 mt-1">
          {collaborators
            .slice(0, 3)
            .map(
              (eventCollab: {
                collaboratorId?: string;
                collaborator?: ICollaborator & { avatar?: string };
                role?: string;
              }) => (
                <div
                  key={eventCollab.collaboratorId}
                  className="relative z-10 w-5 h-5 rounded-full bg-muted border border-card flex items-center justify-center"
                  title={`${eventCollab.collaborator?.name || 'Colaborador'} - ${eventCollab.role}`}
                >
                  {eventCollab.collaborator?.avatar ? (
                    <img
                      src={eventCollab.collaborator.avatar}
                      alt={eventCollab.collaborator.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-foreground font-medium">
                      {eventCollab.collaborator?.name?.charAt(0)?.toUpperCase() || 'C'}
                    </span>
                  )}
                </div>
              )
            )}
          {collaborators.length > 3 && (
            <div className="w-5 h-5 rounded-full bg-muted border border-card flex items-center justify-center">
              <span className="text-xs text-foreground">+{collaborators.length - 3}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const BookingCalendarPage = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendarBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    try {
  const data = await apiFetch(
        `/bookings/calendar?month=${month}&year=${year}`
      );
  const bookings: CalendarBooking[] = asArray<CalendarBooking>(data);
  const calendarEvents: CalendarEvent[] = bookings.map((booking) => {
        const endDate = new Date(
          new Date(booking.eventDate).getTime() + booking.duration * 60 * 60 * 1000
        );
        return {
          title: `${booking.client?.name || 'Cliente'}`,
          start: new Date(booking.eventDate),
          end: endDate,
          allDay: false,
          resource: booking,
        };
      });
      setEvents(calendarEvents);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível carregar os dados do calendário.'
      );
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchCalendarBookings();
  }, [fetchCalendarBookings]);

  const eventStyleGetter = (event: CalendarEvent) => {
    const statusClasses = {
      PENDING: 'event-pending',
      CONFIRMED: 'event-confirmed',
      COMPLETED: 'event-completed',
    };
    const className =
      statusClasses[event.resource.status as keyof typeof statusClasses] || 'event-default';
    return { className };
  };

  // Handler para clicar em um slot (dia)
  const handleSelectSlot = (slotInfo: SlotInfo) => {
    const selectedDate = slotInfo.start;
    const eventsOfDay = events.filter((ev) => {
      const eventDate = ev.start;
      if (!eventDate) return false;
      return (
        eventDate.getFullYear() === selectedDate.getFullYear() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getDate() === selectedDate.getDate()
      );
    });
    if (eventsOfDay.length > 0) {
      setSelectedDayEvents(eventsOfDay);
    }
  };

  return (
    <AdminLayout title="Calendário de Reservas" breadcrumbs={[{ name: 'Admin' }, { name: 'Calendário' }]}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendário de Reservas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Visualize e gerencie as reservas</p>
        </div>
        <div>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>+ Adicionar Reserva Manual</Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}
      {loading && (
        <div className="flex items-center justify-center min-h-[200px]">
          <LoadingSpinner label="Carregando reservas..." />
        </div>
      )}

      <div className="bg-card border rounded-xl p-2 md:p-4 h-[70vh]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          culture="pt-BR"
          messages={{
            next: 'Próximo',
            previous: 'Anterior',
            today: 'Hoje',
            month: 'Mês',
            week: 'Semana',
            day: 'Dia',
            agenda: 'Agenda',
          }}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={(event) => setSelectedEvent(event)}
          onSelectSlot={handleSelectSlot}
          onNavigate={setCurrentDate}
          date={currentDate}
          views={['month', 'week', 'day', 'agenda']}
          defaultView="month"
          selectable
          components={{ event: CustomEventComponent }}
        />
      </div>

      {selectedEvent && (
        <BookingDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
      {selectedDayEvents && (
        <DayEventsModal
          events={selectedDayEvents}
          onClose={() => setSelectedDayEvents(null)}
          onSelectEvent={(ev) => setSelectedEvent(ev)}
        />
      )}
      <ManualBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchCalendarBookings();
        }}
      />
    </AdminLayout>
  );
};
