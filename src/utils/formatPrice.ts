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
