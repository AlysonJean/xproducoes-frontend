import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect, type ChangeEvent, type ComponentType } from 'react';
import { Calendar, dateFnsLocalizer, type Event, type SlotInfo, Views, type View, type CalendarProps } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { apiFetch } from '@/services/api';
import { asArray } from '@/utils/normalize';
import { toNumber } from '@/utils/typeSafeFormatters';
import { formatPrice } from '@/utils/formatPrice';
import type { BookingStatus } from '@/types/enums';
import { BOOKING_STATUS_OPTIONS, bookingStatusLabel, bookingStatusVariant } from '@/utils/bookingStatus';
import { COLLABORATOR_ROLE_OPTIONS, collaboratorRoleLabel } from '@/utils/collaboratorRoles';
import type { Equipment, Kit, CalendarBooking } from '@/types/types';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { 
  Button, 
  Card, 
  Badge, 
  Grid, 
  Modal, 
  Select, 
  Input,
  Alert
} from '@/components/ui/StandardComponents';
import { 
  Search, 
  Plus, 
  Users, 
  Clock, 
  Package, 
  MapPin, 
  Phone, 
  FileText, 
  DollarSign,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Calendar as CalendarIcon
} from 'lucide-react';
import { ManualBookingModal } from '@/components/modals/ManualBookingModal';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/booking-calendar.css';
import withDragAndDrop, { type EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationContext';
import { useCollaborators } from '@/hooks/useCollaborators';
import { NotifyClientCheckbox } from '@/components/bookings/NotifyClientCheckbox';
import { notifyClientPayload } from '@/utils/notifyClient';
import { refreshAdminSummary } from '@/stores/adminSummary';
import { logger } from '../../utils/logger';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface CalendarEvent extends Event {
  resource: CalendarBooking;
}

type FilterStatus = 'ALL' | BookingStatus;
type FilterBinary = 'ALL' | 'YES' | 'NO';
type FilterDateRange = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH';

interface CalendarFilters {
  status: FilterStatus;
  search: string;
  collaboratorId: string;
  hasCollaborators: FilterBinary;
  hasItems: FilterBinary;
  dateRange: FilterDateRange;
}

const BookingDetailsModal = ({
  event,
  onClose,
  onConfirm,
}: {
  event: CalendarEvent;
  onClose: () => void;
  /** Abre a confirmação (valor + responsável). Antes só existia no tooltip de hover — inacessível no toque e no teclado. */
  onConfirm: (booking: CalendarBooking) => void;
}) => {
  const booking = event.resource;
  const navigate = useNavigate();
  const fullAddress = booking.venue
    ? [booking.venue.street, booking.venue.city, booking.venue.postalCode]
        .filter(Boolean)
        .join(', ')
    : '';

  const canConfirm = booking.status === 'DRAFT' || booking.status === 'PENDING';

  const equipmentCount = (booking.equipments?.length || 0) + (booking.kits?.length || 0);
  // D8a: um valor final só, o totalPrice (antes: serviceValue || totalPrice, e cada tela mostrava um).
  const totalValue = booking.totalPrice || 0;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Detalhes da reserva"
      size="lg"
      className="max-h-[90vh]"
    >
      <div className="space-y-8 py-2">
        {/* Header Stats */}
        <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-border/50">
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <FileText className="h-6 w-6" />
             </div>
             <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Código</p>
                <p className="text-sm font-bold text-foreground break-all">{booking.id}</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <Badge variant={bookingStatusVariant(booking.status)} size="lg">
                {bookingStatusLabel(booking.status)}
             </Badge>
          </div>
        </div>

        {/* Info Grid */}
        <Grid columns={{ sm: 1, md: 2 }} gap={8}>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Data e horário</h4>
                <p className="text-sm font-bold text-foreground">{new Date(booking.eventDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(booking.eventDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — 
                  {new Date(new Date(booking.eventDate).getTime() + (booking.duration || 4) * 3600000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Cliente</h4>
                <p className="text-sm font-bold text-foreground truncate">{booking.client?.name || 'Cliente não informado'}</p>
                {booking.client?.phone && (
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" /> {booking.client.phone}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Endereço</h4>
                <p className="text-sm text-foreground leading-relaxed">{fullAddress || 'Endereço não informado'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
             <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
                <Package className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Itens ({equipmentCount})</h4>
                <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                  <ul className="space-y-2">
                    {booking.equipments?.map((eq: Equipment) => (
                      <li key={eq.id} className="text-sm text-foreground flex items-center gap-2">
                         <span className="h-1.5 w-1.5 bg-primary rounded-full shrink-0" aria-hidden="true" /> {eq.name}
                      </li>
                    ))}
                    {booking.kits?.map((kit: Kit) => (
                      <li key={kit.id} className="text-sm text-foreground flex items-center gap-2">
                         <span className="h-1.5 w-1.5 bg-primary rounded-full shrink-0" aria-hidden="true" /> Kit: {kit.name}
                      </li>
                    ))}
                    {equipmentCount === 0 && <li className="text-sm text-muted-foreground">Nenhum item nesta reserva</li>}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-success/10 text-success border border-success/20">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Valor</h4>
                <p className="text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                </p>
              </div>
            </div>
          </div>
        </Grid>

        {/* Collaborators Section */}
        {booking.collaborators && booking.collaborators.length > 0 && (
           <div className="pt-6 border-t border-border/50">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Equipe</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {booking.collaborators.map((c) => (
                    <div key={c.collaboratorId || c.collaborator?.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/20 border border-border/40">
                       <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs shrink-0 overflow-hidden">
                          {c.collaborator?.avatar ? <img src={c.collaborator.avatar} alt={c.collaborator.name} className="h-full w-full object-cover" /> : c.collaborator?.name?.charAt(0)}
                       </div>
                       <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{c.collaborator?.name || 'Colaborador'}</p>
                          <p className="text-xs text-muted-foreground">{collaboratorRoleLabel(c.role)}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap justify-end gap-3 pt-6 border-t border-border/50">
           <Button variant="outline" size="sm" onClick={() => navigate(`/admin/reservas/${booking.id}`)} rightIcon={<ExternalLink className="h-4 w-4" />}>
              Abrir reserva
           </Button>
           {canConfirm && (
             <Button variant="success" size="sm" onClick={() => onConfirm(booking)}>
                Confirmar reserva
             </Button>
           )}
           <Button variant="ghost" size="sm" onClick={onClose}>
              Fechar
           </Button>
        </div>
      </div>
    </Modal>
  );
};

const DayEventsModal = ({
  events,
  onClose,
  onSelectEvent,
}: {
  events: CalendarEvent[];
  onClose: () => void;
  onSelectEvent: (event: CalendarEvent) => void;
}) => (
  <Modal
    isOpen={true}
    onClose={onClose}
    title={`Reservas de ${format(events[0].start!, 'dd/MM/yyyy')}`}
    size="lg"
  >
    <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-2">
      {events.map((ev) => {
        const b = ev.resource;
        const totalValue = b.totalPrice || 0;
        return (
          <button
             type="button"
             key={b.id}
             className="w-full text-left group hover:bg-muted/30 hover:border-primary/30 transition-all duration-300 border-border bg-card rounded-xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             onClick={() => {
               onSelectEvent(ev);
               onClose();
             }}
          >
            <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                     <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                     <h4 className="text-sm font-bold text-foreground truncate">{b.client?.name || 'Cliente não informado'}</h4>
                     <div className="flex items-center gap-2 mt-1">
                        <Badge variant={bookingStatusVariant(b.status)} size="sm">
                           {bookingStatusLabel(b.status)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{format(ev.start!, 'HH:mm')}</span>
                     </div>
                  </div>
               </div>
               <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</p>
                  <p className="text-xs text-muted-foreground">Ver detalhes</p>
               </div>
             </div>
          </button>
        );
      })}
    </div>
  </Modal>
);

const safeDate = (input?: string | Date | null): Date | null => {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return isValid(d) ? d : null;
};

export const BookingCalendarPage = () => {
    const DnDCalendar = useMemo(() => withDragAndDrop<CalendarEvent>(Calendar as unknown as ComponentType<CalendarProps<CalendarEvent, object>>), []);
  const { addNotification } = useNotifications();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CalendarFilters>({
    status: 'ALL',
    search: '',
    collaboratorId: '',
    hasCollaborators: 'ALL',
    hasItems: 'ALL',
    dateRange: 'ALL',
  });
  // Achado (revisão antes do deploy): a agenda buscava GET /collaborators cru e lia `c.name`, mas a
  // API manda o nome dentro de `user` — "Filtrar por colaborador" e "Colaborador responsável"
  // mostravam opções em branco. O hook da tela de Colaboradores já põe esse nome em `name` (mesma
  // correção do BookingDetailPage).
  const { collaborators, error: collaboratorsError, fetchCollaborators } = useCollaborators();
  const [hovered, setHovered] = useState<CalendarEvent | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const mousePosRef = useRef({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (tooltipRef.current && hovered) {
      const x = Math.min(mousePosRef.current.x + 15, window.innerWidth - 340);
      const y = Math.min(mousePosRef.current.y + 15, window.innerHeight - 300);
      tooltipRef.current.style.left = `${x}px`;
      tooltipRef.current.style.top = `${y}px`;
    }
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBookingId, setConfirmBookingId] = useState<string | null>(null);
  const [confirmPrice, setConfirmPrice] = useState<string>('');
  const [confirmCollaboratorId, setConfirmCollaboratorId] = useState<string>('');
  const [confirmRole, setConfirmRole] = useState<string>('ASSISTANT');
  // D11: "Avisar o cliente por e-mail" do modal "Confirmar reserva", marcada a cada abertura.
  const [confirmNotifyClient, setConfirmNotifyClient] = useState(true);

  const calendarStats = useMemo(() => {
    const total = events.length;
    const withCollaborators = events.filter(e => (e.resource.collaborators?.length || 0) > 0).length;
    const confirmed = events.filter(e => e.resource.status === 'CONFIRMED').length;
    const pending = events.filter(e => e.resource.status === 'PENDING').length;
    return { total, withCollaborators, confirmed, pending };
  }, [events]);

  const fetchCalendarBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
        const data = await apiFetch<CalendarBooking[]>('/bookings/calendar');
        const bookings = asArray<CalendarBooking>(data);
        const calendarEvents: CalendarEvent[] = bookings
          .filter((b) => safeDate(b.eventDate))
          .map((booking: CalendarBooking) => {
            const start = safeDate(booking.eventDate)!;
            let end: Date;

            if (booking.eventEndDate && safeDate(booking.eventEndDate)) {
              end = safeDate(booking.eventEndDate)!;
            } else {
              const durationMs = (booking.duration ?? 4) * 3600 * 1000;
              const calculatedEnd = new Date(start.getTime() + durationMs);
              end = calculatedEnd.toDateString() === start.toDateString() 
                ? calculatedEnd 
                : new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59);
            }

            return {
              title: `${booking.client?.name || 'Reserva'}`,
              start,
              end,
              allDay: false,
              resource: booking,
            };
          });
        setEvents(calendarEvents);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o calendário.');
      addNotification({ type: 'error', title: 'Erro ao carregar a agenda', message: 'Não foi possível carregar as reservas do calendário.' });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchCalendarBookings();
  }, [fetchCalendarBookings]);

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  // O hook só guarda a mensagem de erro; a falha continua indo para o logger (Sentry), como antes.
  useEffect(() => {
    if (collaboratorsError) logger.error('Falha ao carregar colaboradores', 'BookingCalendarPage', new Error(collaboratorsError));
  }, [collaboratorsError]);

  const eventStyleGetter = (event: CalendarEvent) => {
    const status = (event.resource.status || 'PENDING') as string;
    const map: Record<string, string> = {
      PENDING: 'event-pending',
      CONFIRMED: 'event-confirmed',
      IN_PROGRESS: 'event-in-progress',
      COMPLETED: 'event-completed',
      CANCELLED: 'event-cancelled',
      DRAFT: 'event-draft',
    };
    return { className: map[status] || 'event-default' };
  };

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

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const booking = e.resource;
      const eventDate = e.start || new Date();
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      if (filters.status !== 'ALL' && (booking.status as string) !== filters.status) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const client = booking.client?.name?.toLowerCase() || '';
        const title = booking.eventTitle?.toLowerCase() || '';
        // Observação interna (Proposta Rápida, desde d3fe9fc) e a observação das reservas antigas, que
        // guardavam esse texto em notes. A rota da agenda é só do admin.
        const notes = [booking.internalNotes, booking.notes].filter(Boolean).join(' ').toLowerCase();
        const phone = booking.client?.phone?.toLowerCase() || '';
        if (![client, title, notes, phone].some((x) => x.includes(s))) return false;
      }
      if (filters.collaboratorId) {
        const colls = booking.collaborators || [];
        if (!colls.some((c) => c.collaborator?.id === filters.collaboratorId || c.collaboratorId === filters.collaboratorId)) return false;
      }
      if (filters.hasCollaborators !== 'ALL') {
        const hasCollabs = (booking.collaborators?.length || 0) > 0;
        if (filters.hasCollaborators === 'YES' && !hasCollabs) return false;
        if (filters.hasCollaborators === 'NO' && hasCollabs) return false;
      }
      if (filters.hasItems !== 'ALL') {
        const hasItems = (booking.equipments?.length || 0) + (booking.kits?.length || 0) > 0;
        if (filters.hasItems === 'YES' && !hasItems) return false;
        if (filters.hasItems === 'NO' && hasItems) return false;
      }
      if (filters.dateRange !== 'ALL') {
        if (filters.dateRange === 'TODAY' && eventDate.toDateString() !== today.toDateString()) return false;
        if (filters.dateRange === 'THIS_WEEK' && (eventDate < weekStart || eventDate >= new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000))) return false;
        if (filters.dateRange === 'THIS_MONTH' && (eventDate < monthStart || eventDate >= new Date(today.getFullYear(), today.getMonth() + 1, 1))) return false;
      }
      return true;
    });
  }, [events, filters]);

  // TODO: Re-enable when applyStatus is used in the calendar UI
  // const applyStatus = async (id: string, status: BookingStatus) => {
  //   try {
  //     setActionLoading(id + status);
  //     await apiFetch(`/bookings/${id}/status`, {
  //       method: 'PUT',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ status })
  //     });
  //     setEvents((prev) => prev.map((e) => (e.resource.id === id ? { ...e, resource: { ...e.resource, status: status } } : e)));
  //     addNotification({ type: 'success', title: 'Status Sincronizado', message: `Reserva atualizada para ${status.toLowerCase()}.` });
  //   } catch (err: unknown) {
  //     addNotification({ type: 'error', title: 'Falha Critical', message: 'Erro ao persistir mudança de status.' });
  //   } finally {
  //     setActionLoading(null);
  //     setHovered(null);
  //   }
  // };

  const confirmWithDetails = async () => {
    if (!confirmBookingId) return;
    try {
      setActionLoading(confirmBookingId + 'CONFIRM');
      const payload: Partial<CalendarBooking> = {};
      if (confirmPrice) payload.totalPrice = Number(confirmPrice);
      if (confirmCollaboratorId) {
        payload.collaborators = [{ collaboratorId: confirmCollaboratorId, role: confirmRole || 'ASSISTANT' }];
      }
      await apiFetch(`/bookings/${confirmBookingId}/confirm-details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, ...notifyClientPayload(confirmNotifyClient) }),
      });
      fetchCalendarBookings();
      // P3: a reserva confirmada sai do número do menu e do cartão do painel na hora.
      void refreshAdminSummary({ force: true });
      setConfirmOpen(false);
      setConfirmBookingId(null);
      addNotification({ type: 'success', title: 'Agenda Confirmada', message: 'Valor e equipe alocados com sucesso.' });
        } catch {
      addNotification({ type: 'error', title: 'Erro de Confirmação', message: 'Falha ao salvar detalhes da agenda.' });
    } finally {
      setActionLoading(null);
    }
  };

  const updateDates = async (id: string, start: Date, end: Date) => {
    await apiFetch(`/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventDate: start.toISOString(),
        eventEndDate: end.toISOString(),
        duration: Math.max(1, Math.round((end.getTime() - start.getTime()) / 3600000))
      })
    });
  };

    const onEventDrop = async ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
    const s = new Date(start);
    const e = new Date(end);
    const prev = events;
    try {
      setEvents((curr) => curr.map((ev) => (ev === event ? { ...ev, start: s, end: e } : ev)));
      await updateDates(event.resource.id, s, e);
      addNotification({ type: 'success', title: 'Horário alterado', message: 'Data e horário da reserva atualizados.' });
    } catch {
      setEvents(prev);
      addNotification({ type: 'error', title: 'Erro ao mover', message: 'Não foi possível alterar a data da reserva.' });
    }
  };

    const onEventResize = async ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
    const s = new Date(start);
    const e = new Date(end);
    const prev = events;
    try {
      setEvents((curr) => curr.map((ev) => (ev === event ? { ...ev, start: s, end: e } : ev)));
      await updateDates(event.resource.id, s, e);
      addNotification({ type: 'success', title: 'Duração alterada', message: 'Duração da reserva atualizada.' });
    } catch {
      setEvents(prev);
      addNotification({ type: 'error', title: 'Erro ao alterar', message: 'Não foi possível alterar a duração da reserva.' });
    }
  };

  const openConfirm = (b: CalendarBooking) => {
    setConfirmBookingId(b.id);
    setConfirmNotifyClient(true);
    // Achado (auditoria ponta a ponta): o "Valor final" vinha do "Valor do serviço" (serviceValue)
    // quando havia, e o confirm-details o grava como totalPrice: confirmar sem mexer no campo trocava
    // o preço da reserva sem ninguém ver (e a página do cliente ainda somava o serviceValue de novo).
    // Parte do total da reserva, como a confirmação da ficha da reserva.
    setConfirmPrice(String(b.totalPrice || ''));
    setConfirmOpen(true);
  };

  return (
    <AdminLayout
      title="Calendário de Reservas"
      breadcrumbs={[{ name: 'Admin', href: '/admin/painel' }, { name: 'Reservas', href: '/admin/reservas' }, { name: 'Calendário' }]}
    >
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
             <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg ring-1 ring-primary/20">
                <CalendarIcon className="h-6 w-6" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-foreground">Agenda de eventos</h2>
                <p className="text-sm text-muted-foreground">Clique num dia ou evento para ver detalhes; arraste um evento para mudar a data.</p>
             </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" /> <dt>Confirmadas:</dt> <dd className="font-semibold text-foreground">{calendarStats.confirmed}</dd>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" /> <dt>Pendentes:</dt> <dd className="font-semibold text-foreground">{calendarStats.pending}</dd>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" /> <dt>Com equipe:</dt> <dd className="font-semibold text-foreground">{calendarStats.withCollaborators}</dd>
                </div>
            </dl>
            <Button size="sm" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
               Reserva manual
            </Button>
          </div>
        </div>

        {/* Toolbar & Global Filters */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-sm p-4 overflow-visible z-30 relative">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
               <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="h-9 w-9">
                     <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="xs" className="h-9" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
                  <Button variant="outline" size="icon" aria-label="Próximo mês" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="h-9 w-9">
                     <ChevronRight className="h-4 w-4" />
                  </Button>
                  <h3 className="text-sm font-bold text-foreground capitalize ml-2 min-w-[140px] text-center" aria-live="polite">
                     {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                  </h3>
               </div>

               <div className="h-8 w-px bg-border/50 hidden lg:block" aria-hidden="true" />

               <div className="flex-1 flex flex-wrap items-center gap-3">
                  <div className="w-full sm:w-44">
                  <Select
                    size="xs"
                    className="h-9 !bg-muted/30"
                    aria-label="Filtrar por status"
                    value={filters.status}
                                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilters(f => ({ ...f, status: e.target.value as FilterStatus }))}
                    options={[
                        { value: 'ALL', label: 'Todos os status' },
                        ...BOOKING_STATUS_OPTIONS
                    ]}
                  />
                  </div>
                  <div className="w-full sm:w-48">
                  <Select
                    size="xs"
                    className="h-9 !bg-muted/30"
                    aria-label="Filtrar por colaborador"
                    value={filters.collaboratorId}
                                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilters(f => ({ ...f, collaboratorId: e.target.value }))}
                    options={[
                        { value: '', label: 'Toda a equipe' },
                        ...collaborators.map(c => ({ value: c.id, label: c.name }))
                    ]}
                  />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                     <Input
                        size="xs"
                        leftIcon={<Search className="h-3.5 w-3.5" />}
                        aria-label="Buscar reservas"
                        className="h-9 !bg-muted/30"
                        placeholder="Buscar cliente, telefone ou observação..."
                        value={filters.search}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => setFilters(f => ({ ...f, search: e.target.value }))}
                     />
                  </div>
                  <Button variant="outline" size="icon" className="h-9 w-9 text-muted-foreground" aria-label="Limpar filtros" title="Limpar filtros" onClick={() => setFilters({
                    status: 'ALL', search: '', collaboratorId: '', hasCollaborators: 'ALL', hasItems: 'ALL', dateRange: 'ALL'
                  })}>
                     <XCircle className="h-4 w-4" />
                  </Button>
               </div>

               <div className="flex items-center gap-1 p-1 bg-muted/40 border border-border rounded-xl shrink-0 self-start" role="group" aria-label="Visualização do calendário">
                   {[
                       { id: Views_MONTH, label: 'Mês' },
                       { id: Views_WEEK, label: 'Semana' },
                       { id: Views_DAY, label: 'Dia' },
                       { id: Views_AGENDA, label: 'Lista' }
                   ].map(v => (
                       <Button
                        key={v.id}
                        size="xs"
                        variant={view === v.id ? 'primary' : 'ghost'}
                        aria-pressed={view === v.id}
                        onClick={() => setView(v.id)}
                       >
                           {v.label}
                       </Button>
                   ))}
               </div>
            </div>
        </Card>

        {/* Global Loading / Error */}
        {error && (
          <Alert
            variant="error"
            title="Erro ao carregar o calendário"
            description={error}
            action={<Button variant="outline" size="sm" onClick={fetchCalendarBookings}>Tentar de novo</Button>}
          />
        )}
        {loading && (
            <div className="flex items-center justify-center p-20">
                <BrandLoader size={80} label="Carregando agenda…" />
            </div>
        )}

        <div className="bg-card border border-border rounded-3xl p-2 sm:p-4 h-[75vh] relative shadow-sm overflow-hidden animate-in fade-in duration-700">
            <DnDCalendar
              localizer={localizer}
              events={filteredEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              culture="pt-BR"
              messages={{ next: 'Próximo', previous: 'Anterior', today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia', agenda: 'Agenda' }}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={(event: CalendarEvent) => setSelectedEvent(event)}
              onSelectSlot={handleSelectSlot}
              onNavigate={(d) => { if (d.getTime() !== currentDate.getTime()) setCurrentDate(d); }}
              date={currentDate}
              views={['month', 'week', 'day', 'agenda']}
              view={view}
              onView={setView}
              selectable
              components={{
                event: ({ event }: { event: CalendarEvent }) => {
                  const booking = event.resource;
                  const count = (booking.equipments?.length || 0) + (booking.kits?.length || 0);
                  const status = (booking.status || 'PENDING').toLowerCase();

                  return (
                    <div
                      className={`custom-event-content status-${status} group/ev`}
                      onMouseMove={(e) => { mousePosRef.current = { x: e.clientX, y: e.clientY }; }}
                      onMouseEnter={(e) => { mousePosRef.current = { x: e.clientX, y: e.clientY }; setHovered(event); }}
                      onMouseLeave={() => setTimeout(() => setHovered(prev => prev?.resource.id === event.resource.id ? null : prev), 50)}
                    >
                      <div className="event-header shrink-0">
                        <div className="event-title text-xs font-semibold truncate leading-tight">
                          {booking.client?.name || 'Sem cliente'}
                        </div>
                      </div>

                      <div className="event-details mt-auto">
                        <div className="event-time text-xs">
                          {format(event.start!, 'HH:mm')}
                        </div>
                        {count > 0 && <div className="text-xs flex items-center gap-0.5"><Package className="h-3 w-3" aria-hidden="true" /> {count}</div>}
                      </div>

                      <div className={`status-indicator status-${status}`} />
                    </div>
                  );
                },
              }}
              toolbar={false}
              onEventDrop={onEventDrop}
              onEventResize={onEventResize}
              resizable
            />
            {/* Resumo no hover (só informativo). As ações — Abrir, Confirmar — ficavam aqui e só
                existiam com mouse; agora estão no modal de detalhes, que abre com clique/toque/teclado.
                O "Editar" ia para /admin/reservas/:id/editar, rota que não existe. */}
            {hovered && (
                <div
                    ref={tooltipRef}
                    className="bc-tooltip pointer-events-none animate-in zoom-in-95 duration-200"
                    aria-hidden="true"
                >
                    <Card className="p-0 border-primary/20 bg-card shadow-2xl overflow-hidden w-72">
                        <div className="p-4 border-b border-border bg-primary/5">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <h4 className="text-sm font-bold text-foreground truncate">{hovered.resource.client?.name || 'Reserva'}</h4>
                                <Badge variant={bookingStatusVariant(hovered.resource.status)} size="sm">{bookingStatusLabel(hovered.resource.status)}</Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" /> {format(hovered.start!, 'HH:mm')} — {format(hovered.end!, 'HH:mm')}
                            </div>
                        </div>
                        <div className="p-4 space-y-2">
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>Itens</span>
                                <span className="text-foreground">{(hovered.resource.equipments?.length || 0) + (hovered.resource.kits?.length || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>Valor</span>
                                <span className="text-foreground">{formatPrice(toNumber(hovered.resource.totalPrice))}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>

        {/* Modals Section */}
        {selectedEvent && (
          <BookingDetailsModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onConfirm={(b) => { setSelectedEvent(null); openConfirm(b); }}
          />
        )}
        {selectedDayEvents && (
          <DayEventsModal
            events={selectedDayEvents}
            onClose={() => setSelectedDayEvents(null)}
            onSelectEvent={(ev) => setSelectedEvent(ev)}
          />
        )}
        
        {/* Advanced Confirmation Modal */}
        {confirmOpen && (
          <Modal isOpen={true} onClose={() => setConfirmOpen(false)} title="Confirmar reserva" size="md">
            <div className="space-y-6 py-2">
               <Alert variant="info" title="Confira os dados" description="Defina o valor final e, se quiser, o colaborador responsável." />
               <div className="space-y-4">
                  <Input label="Valor final (R$)" type="number" step="0.01" value={confirmPrice} onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPrice(e.target.value)} />
                  <Select
                      label="Colaborador responsável (opcional)"
                      value={confirmCollaboratorId}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setConfirmCollaboratorId(e.target.value)}
                      options={[
                          { value: '', label: 'Sem responsável' },
                          ...collaborators.map(c => ({ value: c.id, label: c.name }))
                      ]}
                  />
                  {confirmCollaboratorId && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <Select
                            label="Função"
                            value={confirmRole}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setConfirmRole(e.target.value)}
                            options={COLLABORATOR_ROLE_OPTIONS}
                        />
                    </div>
                  )}
               </div>
               {/* A agenda não traz o e-mail do cliente: o servidor confere se a reserva tem um. */}
               <NotifyClientCheckbox checked={confirmNotifyClient} onChange={setConfirmNotifyClient} />
               <div className="flex flex-wrap justify-end gap-3 pt-4">
                  <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
                  <Button variant="success" size="sm" isLoading={!!actionLoading} onClick={confirmWithDetails}>Confirmar reserva</Button>
               </div>
            </div>
          </Modal>
        )}

        <ManualBookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => { setIsModalOpen(false); fetchCalendarBookings(); addNotification({ type: 'success', title: 'Reserva criada', message: 'A reserva manual foi criada.' }); }}
        />
      </div>
    </AdminLayout>
  );
};

const Views_MONTH = Views.MONTH;
const Views_WEEK = Views.WEEK;
const Views_DAY = Views.DAY;
const Views_AGENDA = Views.AGENDA;

export default BookingCalendarPage;
