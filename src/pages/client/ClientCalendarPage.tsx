
import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { Calendar, dateFnsLocalizer, type Event, type SlotInfo, Views, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isValid, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiFetch } from '@/services/api';
import { asArray } from '@/utils/normalize';
import type { SafeBooking } from '@/types/types';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  Card,
  Badge,
  Modal,
} from '@/components/ui/StandardComponents';
import { Button } from '@/components/ui/Button';
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
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
    `Status: ${booking.status}`,
    `Valor: R$ ${(booking.totalPrice || 0).toFixed(2)}`,
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

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'primary' | 'destructive' | 'secondary' | 'outline'; label: string }> = {
  PENDING: { variant: 'warning', label: 'Pendente' },
  CONFIRMED: { variant: 'success', label: 'Confirmada' },
  IN_PROGRESS: { variant: 'primary', label: 'Em Andamento' },
  COMPLETED: { variant: 'success', label: 'Concluída' },
  CANCELLED: { variant: 'destructive', label: 'Cancelada' },
  DRAFT: { variant: 'outline', label: 'Rascunho' },
};

const getStatus = (status: string | undefined) =>
  statusConfig[status || ''] || { variant: 'outline' as const, label: 'Desconhecido' };

// ─── Booking Details Modal ───────────────────────────────────

const BookingDetailsModal = ({
  event,
  onClose,
}: {
  event: ClientCalendarEvent;
  onClose: () => void;
}) => {
  const booking = event.resource;
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [syncing, setSyncing] = useState(false);
  
  const status = getStatus(booking.status);
  const equipmentCount = (booking.equipments?.length || 0) + (booking.kits?.length || 0);
  const totalValue = booking.totalPrice || 0;
  const googleUrl = generateGoogleCalendarUrl(booking);

  const handleSync = async () => {
    try {
      setSyncing(true);
      await apiFetch(`/google/bookings/${booking.id}/sync`, { method: 'POST' });
      addNotification({
        type: 'success',
        title: 'Sucesso',
        message: 'Reserva sincronizada com o Google Calendar!',
      });
    } catch (error) {
      console.error(error);
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao sincronizar. Verifique se sua conta Google está conectada no perfil.',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Detalhes da Reserva" size="lg">
      <div className="space-y-6 py-2">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">
                {booking.eventTitle || 'Reserva'}
              </h3>
              <p className="text-xs text-muted-foreground">
                #{booking.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4">
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
              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {booking.venue && (
            <div className="flex items-center gap-2 text-sm col-span-2">
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
          <div className="flex items-center gap-2 text-sm bg-yellow-500/10 px-3 py-2 rounded-lg">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span>Avaliação: {booking.review.rating}/5</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-border/50">
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => {
              onClose();
              navigate(`/cliente/reservas/${booking.id}`);
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver Detalhes
          </Button>
          
          <div className="flex flex-1 gap-2">
            <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(googleUrl, '_blank')}
                title="Abrir link do Google Calendar"
            >
                <CalendarPlus className="h-4 w-4 mr-2" />
                Link
            </Button>
            <Button
                variant="outline"
                className="px-3"
                onClick={handleSync}
                isLoading={syncing}
                title="Sincronizar Automaticamente com Google Agenda"
            >
                <RefreshCw className="h-4 w-4" />
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
        const status = getStatus(booking.status);
        return (
          <button
            key={booking.id}
            onClick={() => {
              onClose();
              onSelect(ev);
            }}
            className="w-full text-left p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <div>
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
            <Badge variant={status.variant} className="text-[9px]">
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
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg ring-1 ring-primary/20">
              <CalendarIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground uppercase tracking-tighter">
                Minha Agenda
              </h1>
              <p className="text-xs text-muted-foreground">
                Acompanhe todas as suas reservas no calendário
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/minhas-reservas')}>
              Ver Lista de Reservas
            </Button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-black text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-black text-green-500">{stats.confirmed}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Confirmadas</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-black text-yellow-500">{stats.pending}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Pendentes</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-black text-primary">
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
            <div className="flex items-center gap-2">
              <button
                title="Período anterior"
                onClick={() => {
                  const d = new Date(currentDate);
                  if (view === Views_MONTH) d.setMonth(d.getMonth() - 1);
                  else if (view === Views_WEEK) d.setDate(d.getDate() - 7);
                  else d.setDate(d.getDate() - 1);
                  setCurrentDate(d);
                }}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                Hoje
              </button>
              <button
                title="Próximo período"
                onClick={() => {
                  const d = new Date(currentDate);
                  if (view === Views_MONTH) d.setMonth(d.getMonth() + 1);
                  else if (view === Views_WEEK) d.setDate(d.getDate() + 7);
                  else d.setDate(d.getDate() + 1);
                  setCurrentDate(d);
                }}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <h3 className="text-sm font-black uppercase tracking-tighter ml-2">
                {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </h3>
            </div>

            {/* View Switcher */}
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
              {[
                { id: Views_MONTH, label: 'Mês' },
                { id: Views_WEEK, label: 'Sem' },
                { id: Views_DAY, label: 'Dia' },
                { id: Views_AGENDA, label: 'Lista' },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${
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
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20 text-sm">
            {error}
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center p-20">
            <BrandLoader size={80} label="Carregando sua agenda..." />
          </div>
        )}

        {/* ── Calendar ── */}
        {!loading && (
          <div className="bg-card border border-border/50 rounded-2xl p-4 h-[70vh] relative shadow-xl overflow-hidden animate-in fade-in duration-700">
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
                        <div className="event-title text-[9px] font-black uppercase tracking-tighter truncate leading-none">
                          {booking.eventTitle || 'Reserva'}
                        </div>
                      </div>
                      <div className="event-details mt-auto">
                        <div className="event-time text-[8px] font-bold opacity-60">
                          {format(event.start!, 'HH:mm')}
                        </div>
                        {count > 0 && (
                          <div className="text-[8px] font-bold opacity-60 flex items-center gap-0.5">
                            <Package className="h-2 w-2" /> {count}
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
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-black text-foreground uppercase tracking-tighter truncate w-36">
                        {hovered.resource.eventTitle || 'Reserva'}
                      </h4>
                      <Badge
                        variant={
                          getStatus(hovered.resource.status).variant
                        }
                        className="text-[8px] font-bold"
                      >
                        {getStatus(hovered.resource.status).label}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
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
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Package className="h-3 w-3" />
                      {(hovered.resource.equipments?.length || 0) +
                        (hovered.resource.kits?.length || 0)}{' '}
                      itens
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      R${' '}
                      {(hovered.resource.totalPrice || 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    {hovered.resource.venue && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {[hovered.resource.venue.street, hovered.resource.venue.city]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="p-2 border-t border-border/50 flex gap-1.5">
                    <button
                      onClick={() => {
                        setHovered(null);
                        setSelectedEvent(hovered);
                      }}
                      className="flex-1 text-[9px] font-bold uppercase tracking-wider py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Detalhes
                    </button>
                    <button
                      onClick={() =>
                        window.open(
                          generateGoogleCalendarUrl(hovered.resource),
                          '_blank'
                        )
                      }
                      className="flex-1 text-[9px] font-bold uppercase tracking-wider py-1.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1"
                    >
                      <CalendarPlus className="h-3 w-3" /> Agenda
                    </button>
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
    </div>
  );
};

export default ClientCalendarPage;
