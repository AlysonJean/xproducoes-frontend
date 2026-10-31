import type { BookingListItem } from '../types/types';
import type { BookingStatus } from '../types/enums';
import { formatBookingStatus } from './typeSafeFormatters';
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

const DELIVERY_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PREPARING: 'Em preparação',
  ON_THE_WAY: 'A caminho',
  ARRIVED: 'No local',
  SETUP_COMPLETE: 'Montado',
  PICKUP_PENDING: 'Aguardando recolha',
  COMPLETED: 'Concluída',
};

export function bookingsToSheetRows(bookings: BookingExportSource[]): SheetRow[] {
  return bookings.map((b) => ({
    'Código': b.id,
    'Data do evento': formatDateTime(b.eventDate),
    'Término': formatDateTime(b.eventEndDate),
    'Evento': b.eventTitle || '',
    'Cliente': b.client?.user?.name || b.clientName || '',
    'Empresa': b.client?.companyName || '',
    'E-mail': b.client?.user?.email || b.clientEmail || '',
    'Telefone': b.client?.phone || b.clientContact || '',
    'Cidade': b.city || '',
    'Status': formatBookingStatus(b.status as BookingStatus),
    'Entrega': (b.deliveryStatus && DELIVERY_LABELS[b.deliveryStatus]) || b.deliveryStatus || '',
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
