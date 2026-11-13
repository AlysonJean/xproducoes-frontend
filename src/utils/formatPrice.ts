// Formata um número para moeda brasileira
export function formatPrice(value: number | string | null | undefined): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return 'R$ 0,00';
  }

  // Convert string to number (Prisma Decimal serializes as string)
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Verificar se o valor é válido
  if (typeof numValue !== 'number' || isNaN(numValue) || !isFinite(numValue)) {
    return 'R$ 0,00';
  }
  
  return numValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

// Auditoria do orçamento (12/11/2026), O3: a regra só do valor da reserva. A ficha, a lista e a agenda do painel, os
// PDFs e o botão da proposta da área do cliente usam esta conta; o e-mail do servidor tem o espelho
// (backend/src/utils/bookingTotal.ts).
export const BOOKING_TOTAL_PENDING = 'Em preparação';

/** A reserva já tem valor: maior que zero em centavos inteiros (a conta do servidor, toCents). */
export function hasBookingTotal(value: number | string | null | undefined): boolean {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return typeof numValue === 'number' && Number.isFinite(numValue) && Math.round(numValue * 100) > 0;
}

// Pedido ainda sem valor (o do briefing chega sem itens e o valor sai na confirmação): "R$ 0,00" pareceria de graça.
export function formatBookingTotal(value: number | string | null | undefined): string {
  return hasBookingTotal(value) ? formatPrice(value) : BOOKING_TOTAL_PENDING;
}
