/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BookingStatus, SafeBooking } from '../../types/types';
import { formatPrice } from '../../utils/formatPrice';

interface BookingListItemProps {
  booking: SafeBooking;
  onReviewClick?: (bookingId: string) => void;
  onViewDetails?: (bookingId: string) => void;
}

// Função para formatar data simples
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

// Função para obter o chip do status com as cores corretas
const getStatusChip = (status: BookingStatus) => {
  const statusConfig = {
    DRAFT: { bg: 'bg-muted/40', text: 'text-muted-foreground', label: 'Rascunho' },
    PENDING: { bg: 'bg-warning/20', text: 'text-warning', label: 'Pendente' },
    CONFIRMED: { bg: 'bg-success/20', text: 'text-success', label: 'Confirmado' },
    IN_PROGRESS: { bg: 'bg-primary/20', text: 'text-primary', label: 'Em Progresso' },
    COMPLETED: { bg: 'bg-primary/20', text: 'text-primary', label: 'Concluído' },
    CANCELLED: { bg: 'bg-destructive/20', text: 'text-destructive', label: 'Cancelado' },
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export const BookingListItem = ({ booking, onReviewClick, onViewDetails }: BookingListItemProps) => {
  return (
    <div className="bg-card border border-border p-4 rounded-lg shadow-md hover:bg-card/80 transition-colors duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div className="mb-4 sm:mb-0">
          <p className="text-sm text-muted-foreground">
            Reserva ID: <span className="font-mono text-foreground">{booking.id}</span>
          </p>
          <p className="text-lg font-bold text-foreground">Data: {formatDate(booking.eventDate)}</p>
          {booking.eventTitle && (
            <p className="text-md text-foreground">Evento: {booking.eventTitle}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {getStatusChip(booking.status as BookingStatus)}
          <span className="text-xl font-bold text-primary">{formatPrice(booking.totalPrice)}</span>
          {booking.review && (
            <span className="px-2 py-1 text-xs rounded bg-primary/10 text-primary font-semibold" title="Avaliado">
              ★ {booking.review.rating}
            </span>
          )}
        </div>
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <h4 className="font-semibold mb-2 text-foreground">Equipamentos Reservados:</h4>
        <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">
          {Array.isArray(booking.equipments) && booking.equipments.length > 0 ? (
            booking.equipments.map((eq, idx) => (
              <li key={(eq as any)?.equipmentId || (eq as any)?.id || `${booking.id}-equipment-${idx}`}>
                {(eq as any)?.equipment?.name || (eq as any)?.name || 'Equipamento'}
              </li>
            ))
          ) : (
            <li>— Nenhum equipamento listado</li>
          )}
        </ul>
        {Array.isArray(booking.kits) && booking.kits.length > 0 && (
          <>
            <h4 className="font-semibold mb-2 mt-4 text-foreground">Kits Reservados:</h4>
            <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">
              {booking.kits.map((kit, idx) => (
                <li key={(kit as any)?.kitId || (kit as any)?.id || `${booking.id}-kit-${idx}`}>
                  {(kit as any)?.kit?.name || (kit as any)?.name || 'Kit'}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      {booking.venue && typeof booking.venue === 'object' && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="font-semibold mb-2 text-foreground">Local do Evento:</h4>
          <p className="text-muted-foreground text-sm">
            {booking.venue.street}
            {booking.venue.city && booking.venue.state && `, ${booking.venue.city} - ${booking.venue.state}`}
            {booking.venue.zipCode && ` - CEP: ${booking.venue.zipCode}`}
          </p>
        </div>
      )}
      <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
        <div className="flex gap-2">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(booking.id)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Ver Detalhes
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {booking.status === 'COMPLETED' && onReviewClick && !booking.review && (
            <button
              onClick={() => onReviewClick(booking.id)}
              className="bg-warning hover:bg-warning/80 text-warning-foreground font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Deixar Avaliação
            </button>
          )}
          {booking.status === 'COMPLETED' && booking.review && (
            <span className="text-sm text-muted-foreground">Avaliação enviada</span>
          )}
        </div>
      </div>
    </div>
  );
};
