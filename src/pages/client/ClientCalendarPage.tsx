
import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { Calendar, dateFnsLocalizer, type Event, type SlotInfo, Views, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isValid, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { apiFetch } from '@/services/api';
import { asArray } from '@/utils/normalize';
import { toNumber } from '@/utils/typeSafeFormatters';
import { formatBookingTotal } from '@/utils/formatPrice';
import { formatBookingCode } from '@/utils/bookingCode';
import { bookingStatusVariant, clientBookingStatusLabel } from '@/utils/bookingStatus';
import type { SafeBooking } from '@/types/types';
import {
  Card,
  Badge,
  Modal,
  Button,
  buttonVariants,
} from '@/components/ui/StandardComponents';
import { ClientPage, ClientPageError, ClientPageLoading } from '@/components/client/ClientPage';
import {
  Package,
  MapPin,
  Clock,
  FileText,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ExternalLink,
  Star,
  CalendarPlus,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationContext';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/booking-calendar.css';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const Views_MONTH = 'month' as View;
const Views_WEEK = 'week' as View;
const Views_DAY = 'day' as View;
const Views_AGENDA = 'agenda' as View;

interface ClientCalendarEvent extends Event {
  resource: SafeBooking;
}

const safeDate = (input?: string | Date | null): Date | null => {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return isValid(d) ? d : null;
};

/** Gera link para adicionar evento ao Google Calendar */
function generateGoogleCalendarUrl(booking: SafeBooking): string {
  const start = safeDate(booking.eventDate);
  if (!start) return '#';

  const duration = 4; // horas padrão
  const end = new Date(start.getTime() + duration * 3600 * 1000);

  const formatGCal = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const title = booking.eventTitle || 'Minha Reserva';
  const location = booking.venue
    ? [booking.venue.street, booking.venue.city].filter(Boolean).join(', ')
    : '';

  const equipNames = (booking.equipments || [])
    .map((e) => e.equipment?.name || '')
    .filter(Boolean)
    .join(', ');

  const details = [
    equipNames ? `Equipamentos: ${equipNames}` : '',
    `Status: ${clientBookingStatusLabel(booking)}`,
    `Valor: ${formatBookingTotal(toNumber(booking.totalPrice))}`,
  ]
    .filter(Boolean)
    .join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatGCal(start)}/${formatGCal(end)}`,
    details,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Rótulo e cor do status vêm do módulo compartilhado (antes: um statusConfig local, diferente das
// outras telas — "Em Andamento" em azul primário aqui, outra cor no painel). D11: o rótulo do cliente, com
// "Proposta enviada — aguardando sua resposta" (clientBookingStatusLabel).
const getStatus = (booking: SafeBooking) => ({
  variant: bookingStatusVariant(booking.status),
  label: clientBookingStatusLabel(booking),
});

// ─── Booking Details Modal ───────────────────────────────────

export const BookingDetailsModal = ({
  event,
  onClose,
}: {
  event: ClientCalendarEvent;
  onClose: () => void;
}) => {
  const booking = event.resource;
  const navigate = useNavigate();
  const status = getStatus(booking);
  const equipmentCount = (booking.equipments?.length || 0) + (booking.kits?.length || 0);
  const totalValue = booking.totalPrice || 0;
  const googleUrl = generateGoogleCalendarUrl(booking);


  return (
    <Modal isOpen={true} onClose={onClose} title="Detalhes da Reserva" size="lg">
      <div className="space-y-6 py-2">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/50">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-foreground truncate">
                {booking.eventTitle || 'Reserva'}
              </h3>
              <p className="text-xs text-muted-foreground">
                #{formatBookingCode(booking.id)}
              </p>
            </div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>
              {safeDate(booking.eventDate)
                ? format(safeDate(booking.eventDate)!, "dd 'de' MMMM, yyyy", { locale: ptBR })
                : 'Data não definida'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {safeDate(booking.eventDate)
                ? format(safeDate(booking.eventDate)!, 'HH:mm', { locale: ptBR })
                : '--:--'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span>{equipmentCount} {equipmentCount === 1 ? 'item' : 'itens'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">
              {formatBookingTotal(totalValue)}
            </span>
          </div>
          {booking.venue && (
            <div className="flex items-center gap-2 text-sm sm:col-span-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>
                {[booking.venue.street, booking.venue.city]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Equipment List */}
        {(booking.equipments?.length || 0) > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Equipamentos
            </h4>
            <div className="space-y-1">
              {booking.equipments?.map((eq) => (
                <div
                  key={eq.equipmentId}
                  className="text-sm flex items-center gap-2 py-1 px-2 rounded bg-muted/50"
                >
                  <Package className="h-3 w-3 text-primary" />
                  {eq.equipment?.name || 'Equipamento'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review */}
        {booking.review && (
          <div className="flex items-center gap-2 text-sm bg-warning/10 px-3 py-2 rounded-lg">
            <Star className="h-4 w-4 text-warning fill-warning" aria-hidden="true" />
            <span>Avaliação: {booking.review.rating}/5</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4 border-t border-border/50 sm:flex-row">
          <Button
            variant="primary"
            className="sm:flex-1"
            leftIcon={<ExternalLink className="h-4 w-4" aria-hidden="true" />}
            onClick={() => {
              onClose();
              navigate(`/cliente/reservas/${booking.id}`);
            }}
          >
            Ver Detalhes
          </Button>

          {/* D9: o botão de sincronizar (que exigia a Google Agenda conectada pelo cliente) saiu; a
              conexão com a Google Agenda é só do admin. Este link abre o evento no Google Agenda da
              pessoa e não guarda nada. */}
          <div className="flex gap-2 sm:flex-1">
            <Button
              variant="outline"
              className="flex-1"
              leftIcon={<CalendarPlus className="h-4 w-4" aria-hidden="true" />}
              onClick={() => window.open(googleUrl, '_blank')}
              title="Abrir no Google Agenda"
            >
              Google Agenda
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ─── Day Events Modal ────────────────────────────────────────

const DayEventsModal = ({
  events,
  onClose,
  onSelect,
}: {
  events: ClientCalendarEvent[];
  onClose: () => void;
  onSelect: (e: ClientCalendarEvent) => void;
}) => (
  <Modal isOpen={true} onClose={onClose} title={`${events.length} reservas neste dia`} size="md">
    <div className="space-y-2 py-2">
      {events.map((ev) => {
        const booking = ev.resource;
        const status = getStatus(booking);
        return (
          <button
            key={booking.id}
            onClick={() => {
              onClose();
              onSelect(ev);
            }}
            className="w-full text-left p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors flex items-center justify-between gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {booking.eventTitle || 'Reserva'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {safeDate(booking.eventDate)
                    ? format(safeDate(booking.eventDate)!, 'HH:mm')
                    : '--:--'}{' '}
                  · {booking.equipments?.length || 0} itens
                </p>
              </div>
            </div>
            <Badge variant={status.variant} size="sm" className="shrink-0">
              {status.label}
            </Badge>
          </button>
        );
      })}
    </div>
  </Modal>
);

// ─── Main Page ───────────────────────────────────────────────

export const ClientCalendarPage = () => {
  const { addNotification } = useNotifications();
  const [events, setEvents] = useState<ClientCalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);
  const [selectedEvent, setSelectedEvent] = useState<ClientCalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<ClientCalendarEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<ClientCalendarEvent | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (tooltipRef.current && hovered) {
      const x = Math.min(mousePosRef.current.x + 15, window.innerWidth - 300);
      const y = Math.min(mousePosRef.current.y + 15, window.innerHeight - 200);
      tooltipRef.current.style.left = `${x}px`;
      tooltipRef.current.style.top = `${y}px`;
    }
  });

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<SafeBooking[]>('/bookings/user');
      const bookings = asArray<SafeBooking>(data);
      const calendarEvents: ClientCalendarEvent[] = bookings
        .filter((b) => safeDate(b.eventDate))
        .map((booking) => {
          const start = safeDate(booking.eventDate)!;
          const end = new Date(start.getTime() + 4 * 3600 * 1000); // 4h default

          return {
            title: booking.eventTitle || 'Minha Reserva',
            start,
            end,
            allDay: false,
            resource: booking,
          };
        });
      setEvents(calendarEvents);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar suas reservas.');
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Falha ao carregar o calendário.',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // No celular a grade do mês (7 colunas a 375px) fica ilegível: abre na lista por padrão.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches) {
      setView(Views_AGENDA);
    }
  }, []);

  // ── Stats ──
  const stats = useMemo(() => {
    const total = events.length;
    const confirmed = events.filter((e) => e.resource.status === 'CONFIRMED').length;
    const pending = events.filter((e) => e.resource.status === 'PENDING').length;

    const now = new Date();
    const upcoming = events
      .filter((e) => e.start && new Date(e.start) > now)
      .sort((a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime());

    const nextBooking = upcoming[0] || null;
    const daysUntilNext = nextBooking?.start
      ? differenceInDays(new Date(nextBooking.start), now)
      : null;

    return { total, confirmed, pending, nextBooking, daysUntilNext };
  }, [events]);

  // ── Event style ──
  const eventStyleGetter = (event: ClientCalendarEvent) => {
    const status = (event.resource.status || 'PENDING').toLowerCase();
    const map: Record<string, string> = {
      pending: 'event-pending',
      confirmed: 'event-confirmed',
      in_progress: 'event-in-progress',
      completed: 'event-completed',
      cancelled: 'event-cancelled',
      draft: 'event-draft',
    };
    return { className: map[status] || 'event-default' };
  };

  // ── Slot click (day with multiple events) ──
  const handleSelectSlot = (slotInfo: SlotInfo) => {
    const selectedDate = slotInfo.start;
    const eventsOfDay = events.filter((ev) => {
      const eventDate = ev.start as Date;
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
    <ClientPage
      title="Minha Agenda"
      description="Acompanhe todas as suas reservas no calendário"
      icon={<CalendarIcon className="h-6 w-6" />}
      actions={
        <Link to="/minhas-reservas" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Ver Lista de Reservas
        </Link>
      }
    >
      <div className="space-y-6">
        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{stats.confirmed}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Confirmadas</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Pendentes</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {stats.daysUntilNext !== null ? `${stats.daysUntilNext}d` : '—'}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Próxima Reserva
            </p>
          </Card>
        </div>

        {/* ── Calendar Controls ── */}
        <Card className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Navigation */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Período anterior"
                title="Período anterior"
                onClick={() => {
                  const d = new Date(currentDate);
                  if (view === Views_MONTH) d.setMonth(d.getMonth() - 1);
                  else if (view === Views_WEEK) d.setDate(d.getDate() - 7);
                  else d.setDate(d.getDate() - 1);
                  setCurrentDate(d);
                }}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
              >
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Próximo período"
                title="Próximo período"
                onClick={() => {
                  const d = new Date(currentDate);
                  if (view === Views_MONTH) d.setMonth(d.getMonth() + 1);
                  else if (view === Views_WEEK) d.setDate(d.getDate() + 7);
                  else d.setDate(d.getDate() + 1);
                  setCurrentDate(d);
                }}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <h2 className="ml-2 text-sm font-bold uppercase tracking-tight text-foreground" aria-live="polite">
                {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </h2>
            </div>

            {/* View Switcher */}
            <div className="flex flex-wrap items-center gap-1 bg-muted/50 p-1 rounded-xl" role="group" aria-label="Visualização do calendário">
              {[
                { id: Views_MONTH, label: 'Mês' },
                { id: Views_WEEK, label: 'Semana' },
                { id: Views_DAY, label: 'Dia' },
                { id: Views_AGENDA, label: 'Lista' },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  aria-pressed={view === v.id}
                  className={`min-h-[36px] text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    view === v.id
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* ── Loading / Error ── */}
        {error && <ClientPageError message={error} onRetry={fetchBookings} />}
        {loading && <ClientPageLoading label="Carregando sua agenda..." />}

        {/* ── Calendar ── */}
        {/* Com erro, não mostra o calendário vazio ("Nenhuma reserva neste período") como se fosse dado. */}
        {!loading && !error && (
          <div className="bg-card border border-border/50 rounded-2xl p-2 sm:p-4 h-[70vh] relative shadow-xl overflow-hidden animate-in fade-in duration-700">
            <Calendar<ClientCalendarEvent>
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
                noEventsInRange: 'Nenhuma reserva neste período.',
              }}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={(event: ClientCalendarEvent) => setSelectedEvent(event)}
              onSelectSlot={handleSelectSlot}
              onNavigate={(d) => {
                if (d.getTime() !== currentDate.getTime()) setCurrentDate(d);
              }}
              date={currentDate}
              views={['month', 'week', 'day', 'agenda']}
              view={view}
              onView={setView}
              selectable
              popup
              components={{
                event: ({ event }: { event: ClientCalendarEvent }) => {
                  const booking = event.resource;
                  const count =
                    (booking.equipments?.length || 0) + (booking.kits?.length || 0);
                  const status = (booking.status || 'PENDING').toLowerCase();

                  return (
                    <div
                      className={`custom-event-content status-${status} group/ev`}
                      onMouseMove={(e) => {
                        mousePosRef.current = { x: e.clientX, y: e.clientY };
                      }}
                      onMouseEnter={(e) => {
                        mousePosRef.current = { x: e.clientX, y: e.clientY };
                        setHovered(event);
                      }}
                      onMouseLeave={() =>
                        setTimeout(
                          () =>
                            setHovered((prev) =>
                              prev?.resource.id === event.resource.id ? null : prev
                            ),
                          50
                        )
                      }
                    >
                      <div className="event-header shrink-0">
                        <div className="event-title text-xs font-bold truncate leading-tight">
                          {booking.eventTitle || 'Reserva'}
                        </div>
                      </div>
                      <div className="event-details mt-auto">
                        <div className="event-time text-xs font-semibold opacity-80">
                          {format(event.start!, 'HH:mm')}
                        </div>
                        {count > 0 && (
                          <div className="text-xs font-semibold opacity-80 flex items-center gap-0.5">
                            <Package className="h-3 w-3" aria-hidden="true" /> {count}
                          </div>
                        )}
                      </div>
                      <div className={`status-indicator status-${status}`} />
                    </div>
                  );
                },
              }}
              toolbar={false}
            />

            {/* ── Hover Tooltip ── */}
            {hovered && (
              <div
                ref={tooltipRef}
                className="bc-tooltip animate-in zoom-in-95 duration-200"
                onMouseEnter={() => setHovered(hovered)}
                onMouseLeave={() => setHovered(null)}
              >
                <Card className="p-0 border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden w-64">
                  <div className="p-4 border-b border-border/50 bg-primary/5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="min-w-0 truncate text-sm font-bold text-foreground">
                        {hovered.resource.eventTitle || 'Reserva'}
                      </h3>
                      <Badge variant={getStatus(hovered.resource).variant} size="sm" className="shrink-0">
                        {getStatus(hovered.resource).label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {safeDate(hovered.resource.eventDate)
                        ? format(
                            safeDate(hovered.resource.eventDate)!,
                            "dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )
                        : '—'}
                    </p>
                  </div>
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Package className="h-3 w-3" aria-hidden="true" />
                      {(hovered.resource.equipments?.length || 0) +
                        (hovered.resource.kits?.length || 0)}{' '}
                      itens
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <DollarSign className="h-3 w-3" aria-hidden="true" />
                      {formatBookingTotal(toNumber(hovered.resource.totalPrice))}
                    </div>
                    {hovered.resource.venue && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {[hovered.resource.venue.street, hovered.resource.venue.city]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="p-2 border-t border-border/50 flex gap-1.5">
                    <Button
                      size="xs"
                      className="flex-1"
                      onClick={() => {
                        setHovered(null);
                        setSelectedEvent(hovered);
                      }}
                    >
                      Detalhes
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      className="flex-1"
                      leftIcon={<CalendarPlus className="h-3 w-3" aria-hidden="true" />}
                      onClick={() =>
                        window.open(
                          generateGoogleCalendarUrl(hovered.resource),
                          '_blank'
                        )
                      }
                    >
                      Agenda
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ── Modals ── */}
        {selectedEvent && (
          <BookingDetailsModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
        {selectedDayEvents && (
          <DayEventsModal
            events={selectedDayEvents}
            onClose={() => setSelectedDayEvents(null)}
            onSelect={(ev) => setSelectedEvent(ev)}
          />
        )}
      </div>
    </ClientPage>
  );
};

export default ClientCalendarPage;
