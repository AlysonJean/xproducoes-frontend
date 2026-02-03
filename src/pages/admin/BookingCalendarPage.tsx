import { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, type Event, type SlotInfo, Views, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiFetch } from '@/services/api';
import { asArray } from '@/utils/normalize';
import type { Equipment, Kit, BookingStatus, ICollaborator, CalendarBooking } from '@/types/types';
import { BrandLoader } from '@/components/ui/BrandLoader';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/Button';

// Tipo centralizado em src/types.ts
// Assuming ManualBookingModal is a shared component, moved to a consistent path
import { ManualBookingModal } from '@/components/modals/ManualBookingModal';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/booking-calendar.css';
// Drag & Drop addon
// @ts-ignore - tipos do addon podem não estar presentes dependendo da versão
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { useNavigate } from 'react-router-dom';

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
      PENDING: 'bg-warning/10 text-warning border-warning/20',
      CONFIRMED: 'bg-success/10 text-success border-success/20',
      IN_PROGRESS: 'bg-accent/10 text-accent border-accent/20',
      COMPLETED: 'bg-primary/10 text-primary border-primary/20',
      CANCELLED: 'bg-destructive/10 text-destructive border-destructive/20',
      DRAFT: 'bg-muted text-muted-foreground border-muted',
    };
    return status ? statusClasses[status] || 'bg-muted text-muted-foreground border-muted' : 'bg-muted text-muted-foreground border-muted';
  };

  const getStatusLabel = (status: BookingStatus | undefined) => {
    const labels: Record<string, string> = {
      PENDING: 'Pendente',
      CONFIRMED: 'Confirmada',
      IN_PROGRESS: 'Em Andamento',
      COMPLETED: 'Concluída',
      CANCELLED: 'Cancelada',
      DRAFT: 'Rascunho',
    };
    return status ? labels[status] || status : 'Desconhecido';
  };

  const equipmentCount = (booking.equipments?.length || 0) + (booking.kits?.length || 0);
  const totalValue = booking.serviceValue || booking.totalPrice || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div className="bg-card border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Detalhes da Reserva</h2>
            <p className="text-sm text-muted-foreground mt-1">ID: {booking.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-3xl leading-none"
            aria-label="Fechar"
          >
            &times;
          </button>
        </div>

        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Status e Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Status</label>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusChipClass(booking.status)}`}>
                {getStatusLabel(booking.status)}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Data e Horário</label>
              <div className="text-foreground">
                <div className="font-medium">{new Date(booking.eventDate).toLocaleDateString('pt-BR')}</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(booking.eventDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} -
                  {new Date(new Date(booking.eventDate).getTime() + (booking.duration || 4) * 60 * 60 * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>

          {/* Cliente */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">Cliente</h3>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Nome</label>
                  <p className="text-foreground font-medium">{booking.client?.name || 'Não informado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Contato</label>
                  <p className="text-foreground">{booking.client?.phone || 'Não informado'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Local */}
          {fullAddress && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Local do Evento</h3>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-foreground">{fullAddress}</p>
              </div>
            </div>
          )}

          {/* Itens */}
          {(booking.equipments?.length || booking.kits?.length) && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Itens ({equipmentCount})
              </h3>
              <div className="bg-muted/30 rounded-lg p-4">
                {booking.equipments && booking.equipments.length > 0 && (
                  <div className="mb-3">
                    <h4 className="font-medium text-foreground mb-2">Equipamentos</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {booking.equipments.map((eq: Equipment) => (
                        <li key={eq.id} className="text-foreground">{eq.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {booking.kits && booking.kits.length > 0 && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Kits</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {booking.kits.map((kit: Kit) => (
                        <li key={kit.id} className="text-foreground">Kit: {kit.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Valor */}
          {totalValue > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Valor</h3>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-2xl font-bold text-foreground">
                  R$ {Number(totalValue).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Colaboradores */}
          {booking.collaborators && booking.collaborators.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Colaboradores ({booking.collaborators.length})
              </h3>
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="space-y-3">
                  {booking.collaborators.map((eventCollab: any) => (
                    <div key={eventCollab.collaborator?.id || eventCollab.collaboratorId} className="flex items-center space-x-3">
                      <img
                        src={eventCollab.collaborator?.avatar || '/default-avatar.png'}
                        alt={eventCollab.collaborator?.name || 'Colaborador'}
                        className="w-10 h-10 rounded-full object-cover border"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-foreground">
                          {eventCollab.collaborator?.name || 'Nome não disponível'}
                        </span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({eventCollab.role || 'Função não definida'})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Observações */}
          {booking.internalNotes && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Observações Internas</h3>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-foreground whitespace-pre-wrap">{booking.internalNotes}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-muted/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors"
          >
            Fechar
          </button>
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
                  {booking.equipments && booking.equipments.map((eq: Equipment) => (
                    <li key={eq.id}>{eq.name}</li>
                  ))}
                  {booking.kits && booking.kits.map((kit: Kit) => (
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

// Removido CustomEventComponent (substituído por inline no components.event)

const safeDate = (input?: string | Date | null): Date | null => {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return isValid(d) ? d : null;
};

export const BookingCalendarPage = () => {
  // Calendar com Drag & Drop
  // @ts-ignore
  const DnDCalendar = withDragAndDrop(Calendar as any) as any;
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'ALL' as 'ALL' | 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DRAFT',
    search: '',
    collaboratorId: '',
    hasCollaborators: 'ALL' as 'ALL' | 'YES' | 'NO',
    hasItems: 'ALL' as 'ALL' | 'YES' | 'NO',
    dateRange: 'ALL' as 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH',
  });
  const [collaborators, setCollaborators] = useState<ICollaborator[]>([]);
  const [hovered, setHovered] = useState<CalendarEvent | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // Estado para confirmar com valor e colaborador
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBookingId, setConfirmBookingId] = useState<string | null>(null);
  const [confirmPrice, setConfirmPrice] = useState<string>('');
  const [confirmCollaboratorId, setConfirmCollaboratorId] = useState<string>('');
  const [confirmRole, setConfirmRole] = useState<string>('ASSISTANT');
  const navigate = useNavigate();

  // Estatísticas rápidas
  const calendarStats = useMemo(() => {
    const total = events.length;
    const withCollaborators = events.filter(e => (e.resource.collaborators?.length || 0) > 0).length;
    const confirmed = events.filter(e => e.resource.status === 'CONFIRMED').length;
    const pending = events.filter(e => e.resource.status === 'PENDING').length;

    return { total, withCollaborators, confirmed, pending };
  }, [events]);

  // Navegação rápida
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const fetchCalendarBookings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Removido parâmetros month e year para buscar todas as reservas
  const data = await apiFetch('/bookings/calendar');
      const bookings: CalendarBooking[] = asArray<CalendarBooking>(data);
  const calendarEvents: CalendarEvent[] = bookings
        .filter((b) => safeDate(b.eventDate))
        .map((booking) => {
          const start = safeDate(booking.eventDate)!;
          let end: Date;

          // Se tem eventEndDate definida, usa ela
          if ((booking as any).eventEndDate && safeDate((booking as any).eventEndDate)) {
            end = safeDate((booking as any).eventEndDate)!;
          } else {
            // Caso contrário, calcula baseado na duração, mas garante que seja no mesmo dia
            const durationMs = (booking.duration ?? 4) * 3600 * 1000;
            const calculatedEnd = new Date(start.getTime() + durationMs);

            // Se o evento calculado termina no mesmo dia, usa o horário calculado
            // Se termina em outro dia, limita ao final do dia do start
            if (calculatedEnd.toDateString() === start.toDateString()) {
              end = calculatedEnd;
            } else {
              // Limita ao final do dia do evento (23:59:59)
              end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59);
            }
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

  useEffect(() => {
    // Carregar colaboradores para filtro
    (async () => {
      try {
  const list = await apiFetch('/collaborators');
        setCollaborators(asArray<ICollaborator>(list));
      } catch {}
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
    const className = map[status] || 'event-default';
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

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const booking = e.resource;
      const eventDate = e.start || new Date();
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      // status
      if (filters.status !== 'ALL') {
        if ((booking.status as string) !== filters.status) return false;
      }

      // search
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const client = booking.client?.name?.toLowerCase() || '';
        const title = (booking as any).eventTitle?.toLowerCase() || '';
        const notes = (booking as any).internalNotes?.toLowerCase() || '';
        const phone = booking.client?.phone?.toLowerCase() || '';
        if (![client, title, notes, phone].some((x) => x.includes(s))) return false;
      }

      // collaborator
      if (filters.collaboratorId) {
        const colls = (booking.collaborators || []) as Array<{
          collaboratorId?: string;
          collaborator?: ICollaborator;
        }>;
        if (!colls.some((c) => c.collaborator?.id === filters.collaboratorId || c.collaboratorId === filters.collaboratorId)) {
          return false;
        }
      }

      // has collaborators
      if (filters.hasCollaborators !== 'ALL') {
        const hasCollabs = (booking.collaborators?.length || 0) > 0;
        if (filters.hasCollaborators === 'YES' && !hasCollabs) return false;
        if (filters.hasCollaborators === 'NO' && hasCollabs) return false;
      }

      // has items
      if (filters.hasItems !== 'ALL') {
        const hasItems = (booking.equipments?.length || 0) + (booking.kits?.length || 0) > 0;
        if (filters.hasItems === 'YES' && !hasItems) return false;
        if (filters.hasItems === 'NO' && hasItems) return false;
      }

      // date range
      if (filters.dateRange !== 'ALL') {
        if (filters.dateRange === 'TODAY') {
          if (eventDate.toDateString() !== today.toDateString()) return false;
        } else if (filters.dateRange === 'THIS_WEEK') {
          if (eventDate < weekStart || eventDate >= new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)) return false;
        } else if (filters.dateRange === 'THIS_MONTH') {
          if (eventDate < monthStart || eventDate >= new Date(today.getFullYear(), today.getMonth() + 1, 1)) return false;
        }
      }

      return true;
    });
  }, [events, filters]);

  const ActionTooltip = () => {
    if (!hovered) return null;
    const b = hovered.resource as any;
    const status = (b.status || 'PENDING') as string;
    const venue = typeof b.venue === 'string' ? b.venue : [b.venue?.street, b.venue?.city].filter(Boolean).join(', ');
    const equipmentsCount = (b.equipments?.length || 0) + (b.kits?.length || 0);
    const price = b.serviceValue ?? b.totalPrice ?? b.totalAmount ?? 0;
    const collaborators = b.collaborators || [];
    const s = hovered.start ? new Date(hovered.start as Date) : new Date();
    const e = hovered.end ? new Date(hovered.end as Date) : s;

    return (
      <div className="bc-tooltip">
        <div className="bc-tooltip-card">
          <div className="bc-tooltip-header">
            <div className="bc-tooltip-title">
              {b.client?.name || 'Reserva'}
              <span className={`badge badge-${String(status).toLowerCase()}`}>
                {String(status).replace('_', ' ')}
              </span>
            </div>
            <div className="bc-tooltip-subtitle">
              {format(s, 'dd/MM/yyyy HH:mm')} - {format(e, 'HH:mm')}
            </div>
          </div>

          <div className="bc-tooltip-content">
            <div className="bc-tooltip-row">
              <span className="bc-muted">Cliente</span>
              <span>{b.client?.name || '—'}</span>
            </div>
            <div className="bc-tooltip-row">
              <span className="bc-muted">Contato</span>
              <span>{b.client?.phone || '—'}</span>
            </div>
            <div className="bc-tooltip-row">
              <span className="bc-muted">Local</span>
              <span>{venue || '—'}</span>
            </div>
            <div className="bc-tooltip-row">
              <span className="bc-muted">Itens</span>
              <span>{equipmentsCount > 0 ? `${equipmentsCount} item(ns)` : 'Nenhum'}</span>
            </div>
            {collaborators.length > 0 && (
              <div className="bc-tooltip-row">
                <span className="bc-muted">Colaboradores</span>
                <span>{collaborators.length} atribuído(s)</span>
              </div>
            )}
            <div className="bc-tooltip-row">
              <span className="bc-muted">Valor</span>
              <span>{price ? `R$ ${Number(price).toFixed(2)}` : '—'}</span>
            </div>
            {b.internalNotes && (
              <div className="bc-tooltip-row">
                <span className="bc-muted">Obs</span>
                <span className="text-xs">{b.internalNotes.length > 50 ? `${b.internalNotes.substring(0, 50)}...` : b.internalNotes}</span>
              </div>
            )}
          </div>

          <div className="bc-tooltip-actions">
            <div className="action-buttons-grid">
              <button
                className="btn-ghost btn-small"
                onClick={() => navigate(`/admin/reservas/${hovered.resource.id}/editar`)}
                disabled={!!actionLoading}
                title="Editar reserva"
              >
                ✏️ Editar
              </button>
              <button
                className="btn-ghost btn-small"
                onClick={() => navigate(`/admin/reservas/nova?duplicate=${hovered.resource.id}`)}
                disabled={!!actionLoading}
                title="Duplicar reserva"
              >
                📋 Duplicar
              </button>
              <button
                className="btn-ghost btn-small"
                onClick={() => navigate(`/admin/reservas/${hovered.resource.id}`)}
                disabled={!!actionLoading}
                title="Ver detalhes completos"
              >
                👁️ Detalhes
              </button>
              {status !== 'CONFIRMED' && (
                <button
                  className="btn-ghost btn-small btn-primary"
                  onClick={() => {
                    setConfirmBookingId(hovered.resource.id);
                    setConfirmPrice(String(b.serviceValue || b.totalPrice || ''));
                    setConfirmOpen(true);
                  }}
                  disabled={!!actionLoading}
                  title="Confirmar reserva"
                >
                  ✅ Confirmar
                </button>
              )}
              <button
                className="btn-ghost btn-small btn-success"
                onClick={() => applyStatus(hovered.resource.id, 'COMPLETED')}
                disabled={!!actionLoading}
                title="Marcar como concluída"
              >
                ✓ Concluir
              </button>
              <button
                className="btn-ghost btn-small btn-danger"
                onClick={() => applyStatus(hovered.resource.id, 'CANCELLED')}
                disabled={!!actionLoading}
                title="Cancelar reserva"
              >
                ✕ Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const applyStatus = async (id: string, status: 'COMPLETED' | 'CANCELLED') => {
    try {
      setActionLoading(id + status);
      // Usa endpoint correto para status admin
      await apiFetch(`/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      setEvents((prev) => prev.map((e) => (e.resource.id === id ? { ...e, resource: { ...e.resource, status } as any } : e)));
      setHovered((prev) => (prev && prev.resource.id === id ? { ...prev, resource: { ...prev.resource, status } as any } : prev));
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar status');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmWithDetails = async () => {
    if (!confirmBookingId) return;
    try {
      setActionLoading(confirmBookingId + 'CONFIRM');
      const payload: any = {};
      if (confirmPrice) payload.totalPrice = Number(confirmPrice);
      if (confirmCollaboratorId) {
        payload.collaborators = [
          {
            collaboratorId: confirmCollaboratorId,
            role: confirmRole || 'ASSISTANT',
          },
        ];
      }
      await apiFetch(`/bookings/${confirmBookingId}/confirm-details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      // Atualiza evento localmente: status CONFIRMED, valor e (opcional) colaborador
      setEvents((prev) => prev.map((e) =>
        e.resource.id === confirmBookingId
          ? {
              ...e,
              resource: {
                ...e.resource,
                status: 'CONFIRMED' as any,
                serviceValue: payload.totalPrice ?? (e.resource as any).serviceValue,
                totalPrice: payload.totalPrice ?? (e.resource as any).totalPrice,
                collaborators: payload.collaborators
                  ? [
                      ...(e.resource.collaborators || []),
                      {
                        collaboratorId: confirmCollaboratorId,
                        role: confirmRole,
                        collaborator: collaborators.find((c) => c.id === confirmCollaboratorId),
                      },
                    ]
                  : e.resource.collaborators,
              } as any,
            }
          : e,
      ));
      setHovered(null);
      setConfirmOpen(false);
      setConfirmBookingId(null);
      setConfirmPrice('');
      setConfirmCollaboratorId('');
    } catch (err: any) {
      setError(err?.message || 'Falha ao confirmar reserva');
    } finally {
      setActionLoading(null);
    }
  };

  const updateDates = async (id: string, start: Date, end: Date) => {
    try {
      await apiFetch(`/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventDate: start.toISOString(),
          eventEndDate: end.toISOString(),
          duration: Math.max(1, Math.round((end.getTime() - start.getTime()) / 3600000))
        })
      });
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar datas');
      throw err;
    }
  };

  const onEventDrop = async ({ event, start, end }: any) => {
    const prev = events;
    try {
      setEvents((curr) => curr.map((e) => (e === event ? { ...e, start, end } : e)));
      await updateDates((event as CalendarEvent).resource.id, start, end);
    } catch {
      setEvents(prev);
    }
  };

  const onEventResize = async ({ event, start, end }: any) => {
    const prev = events;
    try {
      setEvents((curr) => curr.map((e) => (e === event ? { ...e, start, end } : e)));
      await updateDates((event as CalendarEvent).resource.id, start, end);
    } catch {
      setEvents(prev);
    }
  };

  return (
    <AdminLayout title="Calendário de Reservas" breadcrumbs={[{ name: 'Admin' }, { name: 'Calendário' }]}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendário de Reservas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Visualize e gerencie as reservas</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Estatísticas rápidas */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold text-foreground">{calendarStats.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Confirmadas:</span>
              <span className="font-semibold text-success">{calendarStats.confirmed}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Pendentes:</span>
              <span className="font-semibold text-warning">{calendarStats.pending}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Com equipe:</span>
              <span className="font-semibold text-primary">{calendarStats.withCollaborators}</span>
            </div>
          </div>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>+ Adicionar Reserva Manual</Button>
        </div>
      </div>

      {/* Toolbar e Filtros no estilo Google Agenda */}
      <div className="booking-toolbar">
        <div className="left">
          <button className="toolbar-btn" onClick={goToPrevMonth} aria-label="Mês anterior">‹</button>
          <button className="toolbar-btn today" onClick={goToToday}>Hoje</button>
          <button className="toolbar-btn" onClick={goToNextMonth} aria-label="Próximo mês">›</button>
          <div className="toolbar-title">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</div>
          <div className="view-toggles">
            <button className={`toolbar-btn ${view === Views.MONTH ? 'active' : ''}`} onClick={() => setView(Views.MONTH)}>Mês</button>
            <button className={`toolbar-btn ${view === Views.WEEK ? 'active' : ''}`} onClick={() => setView(Views.WEEK)}>Semana</button>
            <button className={`toolbar-btn ${view === Views.DAY ? 'active' : ''}`} onClick={() => setView(Views.DAY)}>Dia</button>
            <button className={`toolbar-btn ${view === Views.AGENDA ? 'active' : ''}`} onClick={() => setView(Views.AGENDA)}>Agenda</button>
          </div>
        </div>
        <div className="right">
          <label className="sr-only" htmlFor="statusFilter">Filtrar por status</label>
          <select id="statusFilter" className="toolbar-btn filter" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as any }))}>
            {['ALL','PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','DRAFT'].map((s) => (
              <option key={s} value={s}>{s === 'ALL' ? 'Todos status' : s.replace('_', ' ')}</option>
            ))}
          </select>

          <label className="sr-only" htmlFor="collabFilter">Filtrar por colaborador</label>
          <select id="collabFilter" className="toolbar-btn filter" value={filters.collaboratorId} onChange={(e) => setFilters((f) => ({ ...f, collaboratorId: e.target.value }))}>
            <option value="">Todos colaboradores</option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <label className="sr-only" htmlFor="hasCollabsFilter">Com colaboradores</label>
          <select id="hasCollabsFilter" className="toolbar-btn filter" value={filters.hasCollaborators} onChange={(e) => setFilters((f) => ({ ...f, hasCollaborators: e.target.value as any }))}>
            <option value="ALL">Todos</option>
            <option value="YES">Com colaboradores</option>
            <option value="NO">Sem colaboradores</option>
          </select>

          <label className="sr-only" htmlFor="hasItemsFilter">Com itens</label>
          <select id="hasItemsFilter" className="toolbar-btn filter" value={filters.hasItems} onChange={(e) => setFilters((f) => ({ ...f, hasItems: e.target.value as any }))}>
            <option value="ALL">Todos</option>
            <option value="YES">Com itens</option>
            <option value="NO">Sem itens</option>
          </select>

          <label className="sr-only" htmlFor="dateRangeFilter">Período</label>
          <select id="dateRangeFilter" className="toolbar-btn filter" value={filters.dateRange} onChange={(e) => setFilters((f) => ({ ...f, dateRange: e.target.value as any }))}>
            <option value="ALL">Todo período</option>
            <option value="TODAY">Hoje</option>
            <option value="THIS_WEEK">Esta semana</option>
            <option value="THIS_MONTH">Este mês</option>
          </select>

          <label className="sr-only" htmlFor="searchInput">Buscar por cliente ou título</label>
          <input id="searchInput" className="toolbar-btn filter" placeholder="Buscar cliente/título/telefone" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />

          {(filters.status !== 'ALL' || filters.search || filters.collaboratorId || filters.hasCollaborators !== 'ALL' || filters.hasItems !== 'ALL' || filters.dateRange !== 'ALL') && (
            <button
              className="toolbar-btn"
              onClick={() => setFilters({
                status: 'ALL',
                search: '',
                collaboratorId: '',
                hasCollaborators: 'ALL',
                hasItems: 'ALL',
                dateRange: 'ALL',
              })}
              title="Limpar filtros"
            >
              🗑️ Limpar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}
      {loading && (
        <div className="flex items-center justify-center min-h-[200px]">
          <BrandLoader size={100} label="Carregando reservas..." />
        </div>
      )}

      <div className="bg-card border rounded-xl p-2 md:p-4 h-[70vh] relative">
        <DnDCalendar
          localizer={localizer}
          events={filteredEvents}
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
          onSelectEvent={(event: CalendarEvent) => setSelectedEvent(event)}
          onSelectSlot={handleSelectSlot}
          onNavigate={setCurrentDate}
          date={currentDate}
          views={['month', 'week', 'day', 'agenda']}
          view={view}
          onView={setView}
          selectable
          components={{
            event: ({ event }: { event: CalendarEvent }) => {
              const booking = event.resource;
              const collaborators = booking.collaborators || [];
              const equipmentCount = (booking.equipments?.length || 0) + (booking.kits?.length || 0);
              const hasCollaborators = collaborators.length > 0;
              const status = booking.status || 'PENDING';

              return (
                <div
                  className={`custom-event-content ${hasCollaborators ? 'has-collaborators' : ''} status-${status.toLowerCase()}`}
                  onMouseEnter={() => setHovered(event)}
                  onMouseLeave={() => setHovered((prev) => (prev?.resource.id === event.resource.id ? null : prev))}
                  title={`${booking.client?.name || 'Reserva'} - ${equipmentCount} itens - ${format(event.start!, 'HH:mm')}`}
                >
                  <div className="event-header">
                    <div className="event-title text-xs font-semibold truncate">
                      {booking.client?.name || 'Reserva'}
                    </div>
                    {hasCollaborators && (
                      <div className="collaborator-indicator">
                        <span className="text-xs" title={`${collaborators.length} colaborador(es)`}>👥</span>
                      </div>
                    )}
                  </div>

                  <div className="event-details">
                    <div className="event-time text-xs opacity-80">
                      {format(event.start!, 'HH:mm')}
                    </div>
                    {equipmentCount > 0 && (
                      <div className="event-items text-xs opacity-80">
                        📦 {equipmentCount}
                      </div>
                    )}
                  </div>

                  {collaborators.length > 0 && (
                    <div className="collaborators-avatars flex -space-x-1 mt-1">
                      {collaborators.slice(0, 2).map((c: any) => (
                        <div
                          key={c.collaboratorId || c.collaborator?.id}
                          className="relative z-10 w-4 h-4 rounded-full bg-primary border border-card flex items-center justify-center"
                          title={c.collaborator?.name || c.role}
                        >
                          {c.collaborator?.avatar ? (
                            <img src={c.collaborator.avatar} alt={c.collaborator.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-xs text-primary-foreground font-medium">
                              {c.collaborator?.name?.charAt(0)?.toUpperCase() || 'C'}
                            </span>
                          )}
                        </div>
                      ))}
                      {collaborators.length > 2 && (
                        <div className="w-4 h-4 rounded-full bg-muted border border-card flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">+{collaborators.length - 2}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status indicator */}
                  <div className={`status-indicator status-${status.toLowerCase()}`} />
                </div>
              );
            },
          }}
          toolbar={false}
          // Drag & Drop
          onEventDrop={onEventDrop}
          onEventResize={onEventResize}
          resizable
        />
        <ActionTooltip />
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
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50 p-4">
          <div className="bg-card border rounded-xl p-6 shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">Confirmar reserva</h2>
              <button className="text-2xl text-muted-foreground hover:text-foreground" onClick={() => setConfirmOpen(false)} aria-label="Fechar">&times;</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Valor do serviço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 rounded border bg-background text-foreground"
                  value={confirmPrice}
                  onChange={(e) => setConfirmPrice(e.target.value)}
                  placeholder="Ex.: 500.00"
                />
              </div>
              <div>
                <label htmlFor="confirm-collaborator" className="block text-sm text-muted-foreground mb-1">Atribuir colaborador</label>
                <select
                  id="confirm-collaborator"
                  className="w-full px-3 py-2 rounded border bg-background text-foreground"
                  value={confirmCollaboratorId}
                  onChange={(e) => setConfirmCollaboratorId(e.target.value)}
                >
                  <option value="">(Opcional) Selecionar colaborador</option>
                  {collaborators.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {confirmCollaboratorId && (
                <div>
                  <label htmlFor="confirm-role" className="block text-sm text-muted-foreground mb-1">Função</label>
                  <select
                    id="confirm-role"
                    className="w-full px-3 py-2 rounded border bg-background text-foreground"
                    value={confirmRole}
                    onChange={(e) => setConfirmRole(e.target.value)}
                  >
                    <option value="PHOTOGRAPHER">Fotógrafo</option>
                    <option value="ASSISTANT">Assistente</option>
                    <option value="PRODUCER">Produtor</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button className="toolbar-btn" onClick={() => setConfirmOpen(false)}>Cancelar</button>
              <button className="toolbar-btn today" onClick={confirmWithDetails} disabled={!!actionLoading}>Confirmar</button>
            </div>
          </div>
        </div>
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
