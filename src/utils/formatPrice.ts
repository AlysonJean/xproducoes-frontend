// Formata um número para moeda brasileira
export function formatPrice(value: number): string {
  // Verificar se o valor é válido
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return 'R$ 0,00';
  }
  
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}
