import type { SafeBooking } from '../../types/types';
import { formatBookingTotal } from '../../utils/formatPrice';
import { clientBookingStatusLabel } from '../../utils/bookingStatus';
import { bookingAddressText, bookingEquipmentNames, bookingKitNames } from '../../utils/clientBookingItems';
import { formatBookingCode } from '../../utils/bookingCode';
import { formatBrasiliaDate } from '../../utils/whatsapp';

interface BookingListItemProps {
  booking: SafeBooking;
  onReviewClick?: (bookingId: string) => void;
  onViewDetails?: (bookingId: string) => void;
}


// Cor do selo por status. Achado (mapeamento do lote 13): faltava REFUNDED, e "Minhas Reservas" e o painel do
// cliente quebravam (config undefined) com uma reserva reembolsada. D11 (aprovada em 02/11/2026): o texto vem de
// clientBookingStatusLabel, o mesmo das outras telas do cliente, com "Proposta enviada — aguardando sua resposta".
const STATUS_CHIP_CLASSES: Record<string, string> = {
  DRAFT: 'bg-muted/40 text-muted-foreground',
  PENDING: 'bg-warning/20 text-warning',
  CONFIRMED: 'bg-success/20 text-success',
  // Auditoria do status (21/11/2026), B7: Em andamento tinha a mesma cor de Concluída; agora a das outras telas (info).
  IN_PROGRESS: 'bg-info/20 text-info',
  COMPLETED: 'bg-primary/20 text-primary',
  CANCELLED: 'bg-destructive/20 text-destructive',
  REFUNDED: 'bg-muted/40 text-muted-foreground',
};

const StatusChip = ({ booking }: { booking: SafeBooking }) => (
  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${STATUS_CHIP_CLASSES[booking.status] ?? STATUS_CHIP_CLASSES.DRAFT}`}>
    {clientBookingStatusLabel(booking)}
  </span>
);

export const BookingListItem = ({ booking, onReviewClick, onViewDetails }: BookingListItemProps) => {
  const equipmentNames = bookingEquipmentNames(booking);
  const kitNames = bookingKitNames(booking);
  const address = bookingAddressText(booking);
  return (
    <div className="bg-card border border-border p-4 rounded-lg shadow-md hover:bg-card/80 transition-colors duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div className="mb-4 sm:mb-0">
          <p className="text-sm text-muted-foreground">
            {/* Onda 4 da auditoria de 19/11 (F3-17): o código curto da reserva e a data de Brasília (antes, o id interno e o fuso do aparelho). */}
            Reserva: <span className="font-mono text-foreground">{formatBookingCode(booking.id)}</span>
          </p>
          <p className="text-lg font-bold text-foreground">Data: {formatBrasiliaDate(booking.eventDate)}</p>
          {booking.eventTitle && (
            <p className="text-base text-foreground">Evento: {booking.eventTitle}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <StatusChip booking={booking} />
          {/* Pedido ainda sem valor: "Em preparação", como no painel e na agenda do cliente (ca2f815). */}
          <span className="text-xl font-bold text-primary">{formatBookingTotal(booking.totalPrice)}</span>
          {booking.review && (
            <span className="px-2 py-1 text-xs rounded bg-primary/10 text-primary font-semibold" title="Avaliado">
              ★ {booking.review.rating}
            </span>
          )}
        </div>
      </div>
      <div className="mt-4 border-t border-border pt-4">
        {kitNames.length > 0 && (
          <>
            <h4 className="font-semibold mb-2 text-foreground">Kit Reservado:</h4>
            <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1 mb-4">
              {kitNames.map((name) => (
                <li key={`${booking.id}-kit-${name}`}>{name}</li>
              ))}
            </ul>
          </>
        )}
        {(equipmentNames.length > 0 || kitNames.length === 0) && (
          <>
            <h4 className="font-semibold mb-2 text-foreground">Equipamentos Reservados:</h4>
            <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">
              {equipmentNames.length > 0 ? (
                equipmentNames.map((name, idx) => <li key={`${booking.id}-equipment-${idx}`}>{name}</li>)
              ) : (
                <li>— Nenhum equipamento listado</li>
              )}
            </ul>
          </>
        )}
      </div>
      {address && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="font-semibold mb-2 text-foreground">Local do Evento:</h4>
          <p className="text-muted-foreground text-sm">{address}</p>
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
