
import { BookingStatus, BookingPaymentStatus } from '@/types/enums';

// ================================
// FORMATADORES DE PREÇO
// ================================

export function formatPrice(value: number | string | null | undefined): string {
  const numValue = toNumber(value);
  return numValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

export const formatMoney = (value: number | string | null | undefined): string => {
  return formatPrice(toNumber(value));
};

/**
 * ✅ TYPE-SAFE: Converte para número
 */
export const toNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.,-]/g, '').trim();
    if (cleaned === '' || cleaned === '-' || cleaned === ',' || cleaned === '.') return 0;

    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');

    let normalized = cleaned;

    if (lastComma > lastDot) {
      // Treat comma as decimal separator, remove dots (thousands)
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      // Treat dot as decimal separator, remove commas (thousands)
      normalized = cleaned.replace(/,/g, '');
    } else {
      // Only one type or none: default to dot as decimal after converting comma
      normalized = cleaned.replace(',', '.');
    }

    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

/**
 * ✅ TYPE-SAFE: Calcula economia
 */
export const calculateSavingsAmount = (
  originalPrice: number | string | null | undefined,
  currentPrice: number | string | null | undefined
): number => {
  const orig = toNumber(originalPrice);
  const curr = toNumber(currentPrice);
  return orig > curr ? orig - curr : 0;
};

// ================================
// FORMATADORES DE DATA
// ================================

/**
 * ✅ TYPE-SAFE: Formata data para display
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// ================================
// FORMATADORES DE STATUS
// ================================

/**
 * ✅ TYPE-SAFE: Formata status de booking para display
 */
export const formatBookingStatus = (status: BookingStatus): string => {
  const statusMap: Record<BookingStatus, string> = {
    [BookingStatus.DRAFT]: 'Rascunho',
    [BookingStatus.PENDING]: 'Pendente',
    [BookingStatus.CONFIRMED]: 'Confirmado',
    [BookingStatus.IN_PROGRESS]: 'Em Andamento',
    [BookingStatus.COMPLETED]: 'Concluído',
    [BookingStatus.CANCELLED]: 'Cancelado',
    [BookingStatus.REFUNDED]: 'Reembolsado'
  };
  
  return statusMap[status] || status;
};

export const formatBookingPaymentStatus = (status?: BookingPaymentStatus | string | null): string => {
  const statusMap: Record<BookingPaymentStatus, string> = {
    [BookingPaymentStatus.PENDING]: 'Pendente',
    [BookingPaymentStatus.PARTIAL]: 'Parcial',
    [BookingPaymentStatus.PAID]: 'Pago',
    [BookingPaymentStatus.REFUNDED]: 'Devolvido'
  };

  return (status && statusMap[status as BookingPaymentStatus]) || 'Não informado';
};

// Auditoria do orçamento (12/11/2026), O41: saíram calculateEquipmentTotal, calculateKitTotal e
// calculatePeriodDiscount. Nada as usava, e as contas não eram as do servidor (kit vezes dias, desconto por período
// que a empresa não dá). A conta do pedido é a de utils/bookingPricing.ts.
