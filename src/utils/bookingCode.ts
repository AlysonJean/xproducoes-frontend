// Código da reserva para exibir em mensagens, PDF e telas. Achado: reservas novas têm id legível
// ("XP-ANA-20261120-1900-K4Q", ver backend/src/utils/bookingIdGenerator.ts) e eram cortadas em 8
// caracteres — "XP-ANA-2" não identifica o pedido. Ids antigos (cuid) continuam abreviados.
export const formatBookingCode = (id?: string | null): string => {
  if (!id) return '';
  return id.startsWith('XP-') ? id : id.slice(0, 8);
};
