// D11 (aprovada em 02/11/2026): toda tela do painel que confirma uma reserva, ou a cria já confirmada, tem
// "Avisar o cliente por e-mail" (components/bookings/NotifyClientCheckbox), marcada por padrão. Desmarcada, o
// servidor não manda ao cliente o e-mail de reserva confirmada; a Google Agenda, a escala da equipe e o chat do
// evento seguem iguais. O servidor avisa quando o campo não vem, então o corpo só leva notifyClient: false: com
// a caixa marcada, o corpo fica igual ao de antes.
export function notifyClientPayload(notifyClient: boolean): { notifyClient?: false } {
  return notifyClient ? {} : { notifyClient: false };
}
