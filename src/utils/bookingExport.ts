import type { BookingListItem } from '../types/types';
import type { BookingStatus } from '../types/enums';
import { formatBookingStatus } from './typeSafeFormatters';

// Exportação das reservas da tela de Reservas (o que estiver filtrado) para planilha .xlsx —
// fechamento mensal e notas fiscais. .xlsx em vez de CSV: CSV com vírgula abre numa coluna só
// no Excel em português, e os valores saem como números (somáveis), não texto.

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

// Horário da empresa, independente do fuso de quem exporta.
const dateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const formatDateTime = (iso?: string | null) => (iso ? dateTime.format(new Date(iso)).replace(',', '') : '');
const money = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

export function bookingsToSheetRows(bookings: BookingExportSource[]): Record<string, string | number>[] {
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
  const XLSX = await import('xlsx-js-style');
  const sheet = XLSX.utils.json_to_sheet(bookingsToSheetRows(bookings));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Reservas');
  XLSX.writeFile(book, exportFileName(period));
}
