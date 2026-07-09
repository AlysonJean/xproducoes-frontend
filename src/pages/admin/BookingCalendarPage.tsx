/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect, type ChangeEvent, type ComponentType } from 'react';
import { Calendar, dateFnsLocalizer, type Event, type SlotInfo, Views, type View, type CalendarProps } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { apiFetch } from '@/services/api';
import { asArray } from '@/utils/normalize';
import { toNumber } from '@/utils/typeSafeFormatters';
import { BookingStatus, ECollaboratorRole } from '@/types/enums';
import type { Equipment, Kit, ICollaborator, CalendarBooking } from '@/types/types';
import type { StandardVariant } from '@/components/ui/StandardTypes';
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
  Calendar as CalendarIcon
} from 'lucide-react';
import { ManualBookingModal } from '@/components/modals/ManualBookingModal';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/booking-calendar.css';
import withDragAndDrop, { type EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationContext';

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

const BookingDetailsModal = ({ event, onClose }: { event: CalendarEvent; onClose: () => void }) => {
  const booking = event.resource;
  const navigate = useNavigate();
  const fullAddress = booking.venue
    ? [booking.venue.street, booking.venue.city, booking.venue.postalCode]
        .filter(Boolean)
        .join(', ')
    : '';

    const statusMap: Record<string, { variant: StandardVariant; label: string }> = {
    PENDING: { variant: 'warning', label: 'Pendente' },
    CONFIRMED: { variant: 'success', label: 'Confirmada' },
    IN_PROGRESS: { variant: 'primary', label: 'Em Andamento' },
    COMPLETED: { variant: 'success', label: 'Concluída' },
    CANCELLED: { variant: 'destructive', label: 'Cancelada' },
    DRAFT: { variant: 'outline', label: 'Rascunho' },
  };

  const getStatus = (status: string | undefined) => statusMap[status || ''] || { variant: 'outline', label: 'Desconhecido' };

  const equipmentCount = (booking.equipments?.length || 0) + (booking.kits?.length || 0);
  const totalValue = booking.serviceValue || booking.totalPrice || 0;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Ficha Detalhada da Reserva"
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
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5">Identificador</p>
                <p className="text-sm font-black text-foreground uppercase tracking-wider">{booking.id}</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <Badge variant={getStatus(booking.status).variant} className="text-[10px] font-black uppercase tracking-widest px-4 py-1.5 ring-4 ring-offset-2 ring-transparent">
                {getStatus(booking.status).label}
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
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Data e Cronologia</h4>
                <p className="text-sm font-bold text-foreground">{new Date(booking.eventDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-medium">
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
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Stakeholder / Cliente</h4>
                <p className="text-sm font-bold text-foreground truncate">{booking.client?.name || 'Não Identificado'}</p>
                {booking.client?.phone && (
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-medium">
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
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Localização Técnica</h4>
                <p className="text-xs font-bold text-foreground leading-relaxed italic">{fullAddress || 'Endereço não parametrizado'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
             <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
                <Package className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Escopo de Ativos ({equipmentCount})</h4>
                <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                  <ul className="space-y-2">
                    {booking.equipments?.map((eq: Equipment) => (
                      <li key={eq.id} className="text-[10px] font-bold text-foreground flex items-center gap-2">
                         <div className="h-1 w-1 bg-primary rounded-full" /> {eq.name}
                      </li>
                    ))}
                    {booking.kits?.map((kit: Kit) => (
                      <li key={kit.id} className="text-[10px] font-bold text-foreground flex items-center gap-2">
                         <div className="h-1 w-1 bg-indigo-500 rounded-full" /> KIT: {kit.name}
                      </li>
                    ))}
                    {equipmentCount === 0 && <li className="text-[10px] text-muted-foreground font-medium uppercase italic opacity-50">Sem itens alocados</li>}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Acordo Comercial</h4>
                <p className="text-2xl font-black text-foreground tracking-tighter">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                </p>
              </div>
            </div>
          </div>
        </Grid>

        {/* Collaborators Section */}
        {booking.collaborators && booking.collaborators.length > 0 && (
           <div className="pt-6 border-t border-border/50">
              <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Equipe Técnica Atribuída</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {booking.collaborators.map((c) => (
                    <div key={c.collaboratorId || c.collaborator?.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/20 border border-border/40">
                       <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs shrink-0 overflow-hidden">
                          {c.collaborator?.avatar ? <img src={c.collaborator.avatar} alt={c.collaborator.name} className="h-full w-full object-cover" /> : c.collaborator?.name?.charAt(0)}
                       </div>
                       <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{c.collaborator?.name || 'Técnico'}</p>
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">{c.role}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-8 border-t border-border/50">
           <Button variant="outline" size="sm" className="font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-2xl" onClick={() => navigate(`/admin/reservas/${booking.id}`)}>
              Gestão Full <ExternalLink className="ml-2 h-3 w-3" />
           </Button>
           <Button variant="primary" size="sm" className="font-black uppercase text-[10px] tracking-widest h-10 px-8 rounded-2xl shadow-lg shadow-primary/20" onClick={onClose}>
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
    title={`Operações em: ${format(events[0].start!, 'dd/MM/yyyy')}`}
    size="lg"
  >
    <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
      {events.map((ev) => {
        const b = ev.resource;
        const totalValue = b.serviceValue || b.totalPrice || 0;
        return (
          <div 
             key={b.id}
             className="group cursor-pointer hover:bg-muted/30 hover:border-primary/30 transition-all duration-300 border-border/50 bg-card/50 rounded-xl border p-4"
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
                     <h4 className="text-[13px] font-black text-foreground uppercase tracking-tight truncate">{b.client?.name || 'Registro Manual'}</h4>
                     <div className="flex items-center gap-2 mt-1">
                        <Badge variant={b.status === 'CONFIRMED' ? 'success' : 'warning'} className="text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5">
                           {b.status}
                        </Badge>
                        <span className="text-[10px] font-medium text-muted-foreground">— {format(ev.start!, 'HH:mm')}</span>
                     </div>
                  </div>
               </div>
               <div className="text-right shrink-0">
                  <p className="text-sm font-black text-foreground tracking-tighter">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</p>
                  <p className="text-[9px] font-black text-muted-foreground uppercase opacity-50">Clique para expandir</p>
               </div>
             </div>
          </div>
        );
      })}
    </div>
  </Modal>
);

const ExternalLink = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
);

const safeDate = (input?: string | Date | null): Date | null => {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return isValid(d) ? d : null;
};

export const BookingCalendarPage = () => {
    const DnDCalendar = useMemo(() => withDragAndDrop<CalendarEvent>(Calendar as unknown as ComponentType<CalendarProps<CalendarEvent, object>>), []);
  const navigate = useNavigate();
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
  const [collaborators, setCollaborators] = useState<ICollaborator[]>([]);
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
  const [confirmRole, setConfirmRole] = useState<ECollaboratorRole>(ECollaboratorRole.ASSISTANT);

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
      setError(err instanceof Error ? err.message : 'Falha na sincronização operacional.');
      addNotification({ type: 'error', title: 'Radar Offline', message: 'Não foi possível sincronizar o calendário em tempo real.' });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchCalendarBookings();
  }, [fetchCalendarBookings]);

  useEffect(() => {
    (async () => {
      try {
        const list = await apiFetch<ICollaborator[]>('/collaborators');
        setCollaborators(asArray<ICollaborator>(list));
      } catch (err) {
        console.error('Falha ao carregar colaboradores', err);
      }
    })();
  }, []);

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
        const notes = booking.internalNotes?.toLowerCase() || '';
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
        payload.collaborators = [{ collaboratorId: confirmCollaboratorId, role: confirmRole || ECollaboratorRole.ASSISTANT }];
      }
      await apiFetch(`/bookings/${confirmBookingId}/confirm-details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      fetchCalendarBookings();
      setConfirmOpen(false);
      setConfirmBookingId(null);
      addNotification({ type: 'success', title: 'Agenda Confirmada', message: 'Valor e equipe alocados com sucesso.' });
        } catch (err: unknown) {
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
      addNotification({ type: 'success', title: 'Horário Reprogramado', message: 'Bloqueio de agenda atualizado via drag & drop.' });
    } catch {
      setEvents(prev);
    }
  };

    const onEventResize = async ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
    const s = new Date(start);
    const e = new Date(end);
    const prev = events;
    try {
      setEvents((curr) => curr.map((ev) => (ev === event ? { ...ev, start: s, end: e } : ev)));
      await updateDates(event.resource.id, s, e);
      addNotification({ type: 'success', title: 'Duração Ajustada', message: 'Vigência do evento atualizada.' });
    } catch {
      setEvents(prev);
    }
  };

  return (
    <AdminLayout title="Agenda Operativa" breadcrumbs={[{ name: 'Admin' }, { name: 'Painel' }, { name: 'Calendário' }]}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
             <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg ring-1 ring-primary/20">
                <CalendarIcon className="h-6 w-6" />
             </div>
             <div>
                <h2 className="text-xl font-black text-foreground uppercase tracking-tighter">Cronograma de Reservas</h2>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.1em]">Visão unificada de ativos e eventos</p>
             </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="hidden sm:flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" /> Conf: <span className="text-foreground">{calendarStats.confirmed}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" /> Pend: <span className="text-foreground">{calendarStats.pending}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" /> Equipe: <span className="text-foreground">{calendarStats.withCollaborators}</span>
                </div>
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="gap-2 font-black uppercase text-[10px] tracking-widest h-11 px-6 px shadow-xl shadow-primary/20">
               <Plus className="h-4 w-4" /> Reserva Manual
            </Button>
          </div>
        </div>

        {/* Toolbar & Global Filters */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-sm p-4 overflow-visible z-30 relative">
            <div className="flex flex-col md:flex-row items-center gap-6">
               <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="h-9 w-9 border-border/60">
                     <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="h-9 px-4 font-black uppercase text-[10px] tracking-widest border-border/60" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
                  <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="h-9 w-9 border-border/60">
                     <ChevronRight className="h-4 w-4" />
                  </Button>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest ml-4 min-w-[140px] text-center">
                     {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                  </h3>
               </div>

               <div className="h-8 w-px bg-border/50 hidden md:block" />

               <div className="flex-1 flex flex-wrap items-center gap-3">
                  <Select 
                    className="w-40 h-9 text-[10px] font-bold uppercase tracking-widest !bg-muted/30"
                    placeholder="Status"
                    value={filters.status}
                                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilters(f => ({ ...f, status: e.target.value as FilterStatus }))}
                    options={[
                        { value: 'ALL', label: 'Todos Status' },
                        ...Object.values(BookingStatus).map(s => ({ value: s, label: s.replace('_', ' ') }))
                    ]}
                  />
                  <Select 
                    className="w-44 h-9 text-[10px] font-bold uppercase tracking-widest !bg-muted/30"
                    placeholder="Colaborador"
                    value={filters.collaboratorId}
                                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilters(f => ({ ...f, collaboratorId: e.target.value }))}
                    options={[
                        { value: '', label: 'Toda Equipe' },
                        ...collaborators.map(c => ({ value: c.id, label: c.name }))
                    ]}
                  />
                  <div className="relative flex-1 min-w-[200px]">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                     <Input 
                        className="pl-9 h-9 text-xs font-medium placeholder:text-muted-foreground/50 border-border/60 !bg-muted/30"
                        placeholder="Pesquisar cliente, id ou notas..."
                        value={filters.search}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => setFilters(f => ({ ...f, search: e.target.value }))}
                     />
                  </div>
                  <Button variant="outline" size="icon" className="h-9 w-9 border-border/60 text-muted-foreground" onClick={() => setFilters({
                    status: 'ALL', search: '', collaboratorId: '', hasCollaborators: 'ALL', hasItems: 'ALL', dateRange: 'ALL'
                  })}>
                     <XCircle className="h-4 w-4" />
                  </Button>
               </div>

               <div className="flex items-center gap-1 p-1 bg-muted/40 border border-border/40 rounded-xl shrink-0">
                   {[
                       { id: Views_MONTH, label: 'Mês' },
                       { id: Views_WEEK, label: 'Sem' },
                       { id: Views_DAY, label: 'Dia' },
                       { id: Views_AGENDA, label: 'Lista' }
                   ].map(v => (
                       <button 
                        key={v.id}
                                                onClick={() => setView(v.id)}
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${view === v.id ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-muted'}`}
                       >
                           {v.label}
                       </button>
                   ))}
               </div>
            </div>
        </Card>

        {/* Global Loading / Error */}
        {error && <Alert variant="error" title="Erro de Sincronia" description={error} />}
        {loading && (
            <div className="flex items-center justify-center p-20">
                <BrandLoader size={80} label="Equalizando fluxo operativo..." />
            </div>
        )}

        <div className="bg-card border border-border/50 rounded-[2rem] p-4 h-[75vh] relative shadow-2xl overflow-hidden animate-in fade-in duration-700">
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
                        <div className="event-title text-[9px] font-black uppercase tracking-tighter truncate leading-none">
                          {booking.client?.name || 'Manual'}
                        </div>
                      </div>

                      <div className="event-details mt-auto">
                        <div className="event-time text-[8px] font-bold opacity-60">
                          {format(event.start!, 'HH:mm')}
                        </div>
                        {count > 0 && <div className="text-[8px] font-bold opacity-60 flex items-center gap-0.5"><Package className="h-2 w-2" /> {count}</div>}
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
            {/* Action Tooltip (Enhanced Hover) */}
            {hovered && (
                <div 
                    ref={tooltipRef}
                    className="bc-tooltip animate-in zoom-in-95 duration-200"
                    onMouseEnter={() => setHovered(hovered)}
                    onMouseLeave={() => setHovered(null)}
                >
                    <Card className="p-0 border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden w-72">
                        <div className="p-5 border-b border-border/50 bg-primary/5">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-black text-foreground uppercase tracking-tighter truncate w-40">{hovered.resource.client?.name || 'Evento'}</h4>
                                <Badge variant={hovered.resource.status === 'CONFIRMED' ? 'success' : 'warning'} className="text-[8px] font-black uppercase tracking-widest">{hovered.resource.status}</Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase opacity-70">
                                <Clock className="h-3 w-3" /> {format(hovered.start!, 'HH:mm')} — {format(hovered.end!, 'HH:mm')}
                            </div>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
                                <span>Patrimônio</span>
                                <span>{(hovered.resource.equipments?.length || 0) + (hovered.resource.kits?.length || 0)} Itens</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
                                <span>Investimento</span>
                                <span className="text-foreground">R$ {toNumber(hovered.resource.serviceValue || hovered.resource.totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                        <div className="p-3 bg-muted/30 grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" className="h-8 text-[9px] uppercase font-black tracking-widest bg-card" onClick={() => navigate(`/admin/reservas/${hovered.resource.id}/editar`)}>Editar</Button>
                            <Button variant="outline" size="sm" className="h-8 text-[9px] uppercase font-black tracking-widest bg-card" onClick={() => setSelectedEvent(hovered)}>Detalhes</Button>
                            {hovered.resource.status !== 'CONFIRMED' && (
                                <Button className="h-8 text-[9px] uppercase font-black tracking-widest col-span-2 bg-emerald-600 hover:bg-emerald-500" onClick={() => { setConfirmBookingId(hovered.resource.id); setConfirmPrice(String(hovered.resource.serviceValue || hovered.resource.totalPrice || '')); setConfirmOpen(true); }}>Confirmar Operação</Button>
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </div>

        {/* Modals Section */}
        {selectedEvent && <BookingDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
        {selectedDayEvents && (
          <DayEventsModal
            events={selectedDayEvents}
            onClose={() => setSelectedDayEvents(null)}
            onSelectEvent={(ev) => setSelectedEvent(ev)}
          />
        )}
        
        {/* Advanced Confirmation Modal */}
        {confirmOpen && (
          <Modal isOpen={true} onClose={() => setConfirmOpen(false)} title="Chancela Operativa" size="md">
            <div className="space-y-6 py-2">
               <Alert variant="info" title="Finalização Sugerida" description="Defina os parâmetros finais para confirmar a alocação de equipe e itens." />
               <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Ajuste de Valor (R$)</label>
                                        <Input type="number" step="0.01" value={confirmPrice} onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPrice(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Atribuir Master Líder</label>
                    <Select 
                        value={confirmCollaboratorId}
                                                onChange={(e: ChangeEvent<HTMLSelectElement>) => setConfirmCollaboratorId(e.target.value)}
                        placeholder="Pesquisar na equipe..."
                        options={[
                            { value: '', label: 'Sem líder fixo' },
                            ...collaborators.map(c => ({ value: c.id, label: c.name }))
                        ]}
                    />
                  </div>
                  {confirmCollaboratorId && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Responsabilidade</label>
                        <Select 
                            value={confirmRole}
                                                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setConfirmRole(e.target.value as ECollaboratorRole)}
                            options={[
                                { value: 'PHOTOGRAPHER', label: 'Líder Fotógrafo' },
                                { value: 'ASSISTANT', label: 'Suporte Operacional' },
                                { value: 'PRODUCER', label: 'Coordenação' }
                            ]}
                        />
                    </div>
                  )}
               </div>
               <div className="flex justify-end gap-3 pt-4 font-black uppercase text-[10px] tracking-widest">
                  <Button variant="outline" className="h-11 px-6 rounded-2xl" onClick={() => setConfirmOpen(false)}>Abortar</Button>
                  <Button className="h-11 px-8 rounded-2xl shadow-xl shadow-primary/20 bg-emerald-600 hover:bg-emerald-500" isLoading={!!actionLoading} onClick={confirmWithDetails}>Efetivar Agenda</Button>
               </div>
            </div>
          </Modal>
        )}

        <ManualBookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => { setIsModalOpen(false); fetchCalendarBookings(); addNotification({ type: 'success', title: 'Reserva Gerada', message: 'Ficha de reserva manual incluída no sistema.' }); }}
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
