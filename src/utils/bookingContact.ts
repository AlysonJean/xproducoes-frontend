// Contato do cliente de uma reserva para os botões manuais do painel (WhatsApp, PDF da proposta) e
// para a ficha da reserva.
// Achado (auditoria ponta a ponta): a lista de Reservas só olhava o telefone do cadastro, e a proposta
// de cliente digitado (sem cadastro, contato na própria reserva) abria o WhatsApp sem destinatário. A
// ficha punha o telefone e o e-mail do cadastro antes dos informados na reserva: a reserva que a
// Proposta Rápida pendurou no cadastro de cliente do próprio admin (antes de 89ef066) mandava a
// proposta para o telefone de outro cliente. Mesma regra do servidor (whatsappService.bookingPhone e o
// e-mail de aprovação em bookingStatusService): o contato desta reserva vem antes; o do cadastro fica
// para quando ele falta ou é um e-mail (o orçamento do site sem telefone manda o e-mail no contato).

type BookingContactSource = {
  clientContact?: string | null;
  clientEmail?: string | null;
  client?: { phone?: string | null; user?: { email?: string | null } | null } | null;
};

const contactIsEmail = (booking: BookingContactSource) => Boolean(booking.clientContact?.includes('@'));

export const bookingPhone = (booking: BookingContactSource): string | undefined =>
  (contactIsEmail(booking) ? undefined : booking.clientContact) || booking.client?.phone || undefined;

export const bookingEmail = (booking: BookingContactSource): string | undefined =>
  booking.clientEmail || booking.client?.user?.email || (contactIsEmail(booking) ? booking.clientContact : undefined) || undefined;

// Número para o wa.me, que exige o DDI: o telefone é digitado sem ele ("(31) 98888-7777"), e 31 é o DDI
// da Holanda. 10 ou 11 dígitos ganham o 55, como no envio do servidor (whatsappService.sendMessage).
export const toWhatsAppNumber = (phone?: string | null): string | null => {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits.length >= 12 ? digits : null;
};
