import type { BookingListItem } from '../types/types';
import type { BookingStatus } from '../types/enums';
import { formatBookingPaymentStatus, formatBookingStatus } from './typeSafeFormatters';
import { DELIVERY_STATUS_LABELS } from './bookingStatus';
import { bookingEmail, bookingPhone } from './bookingContact';
import { downloadSheet, formatDateTimeBR as formatDateTime, toMoney as money, type SheetRow } from './spreadsheet';

// Exportação das reservas da tela de Reservas (o que estiver filtrado) para planilha .xlsx —
// fechamento mensal e notas fiscais.

// A API devolve mais campos do que o tipo da lista declara.
export type BookingExportSource = BookingListItem & Partial<{
  city: string | null;
  clientEmail: string | null;
  clientContact: string | null;
  discountAmount: string | number | null;
  serviceValue: string | number | null;
  createdAt: string;
}>;

// Rótulos de entrega: fonte única em utils/bookingStatus (mantido o nome para quem já importa daqui).
export const DELIVERY_LABELS = DELIVERY_STATUS_LABELS;

export function bookingsToSheetRows(bookings: BookingExportSource[]): SheetRow[] {
  return bookings.map((b) => ({
    'Código': b.id,
    'Data do evento': formatDateTime(b.eventDate),
    'Término': formatDateTime(b.eventEndDate),
    'Evento': b.eventTitle || '',
    'Cliente': b.client?.user?.name || b.clientName || '',
    'Empresa': b.client?.companyName || '',
    // Achado (auditoria ponta a ponta): o e-mail e o telefone do cadastro vinham antes dos informados
    // na reserva; a reserva que a Proposta Rápida pendurou no cadastro do próprio admin (antes de
    // 89ef066) saía com o telefone de outro cliente e o e-mail da conta do admin. Mesma regra da ficha
    // e do WhatsApp (utils/bookingContact); contato que é e-mail não vai mais para a coluna Telefone.
    'E-mail': bookingEmail(b) || '',
    'Telefone': bookingPhone(b) || '',
    'Cidade': b.city || '',
    'Status': formatBookingStatus(b.status as BookingStatus),
    'Entrega': (b.deliveryStatus && DELIVERY_LABELS[b.deliveryStatus]) || b.deliveryStatus || '',
    'Pagamento': formatBookingPaymentStatus(b.paymentStatus),
    'Valor total (R$)': money(b.totalPrice),
    'Desconto (R$)': money(b.discountAmount),
    'Valor de serviço (R$)': money(b.serviceValue),
    'Criado em': formatDateTime(b.createdAt),
  }));
}

export function exportFileName({ startDate, endDate }: { startDate?: string; endDate?: string }): string {
  if (startDate && endDate) return `reservas_${startDate}_a_${endDate}.xlsx`;
  if (startDate) return `reservas_desde_${startDate}.xlsx`;
  if (endDate) return `reservas_ate_${endDate}.xlsx`;
  return 'reservas_todas.xlsx';
}

export async function downloadBookingsSpreadsheet(
  bookings: BookingExportSource[],
  period: { startDate?: string; endDate?: string },
): Promise<void> {
  await downloadSheet(bookingsToSheetRows(bookings), 'Reservas', exportFileName(period));
}
