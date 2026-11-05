import { describe, it, expect } from 'vitest';
import { bookingEmail, bookingPhone, toWhatsAppNumber } from '../bookingContact';

// Mesma regra do servidor (utils/bookingContact.bookingPhone, que o WhatsApp e a agenda usam, e o e-mail
// de aprovação em bookingStatusService): o contato informado na reserva vem antes do cadastro; contato
// que é e-mail não serve de telefone.
describe('bookingContact', () => {
  const cadastro = { phone: '31911112222', user: { email: 'conta@cliente.test' } };

  it('telefone: o da reserva antes do cadastro; o do cadastro quando falta ou é e-mail', () => {
    expect(bookingPhone({ clientContact: '31988887777', client: cadastro })).toBe('31988887777');
    expect(bookingPhone({ clientContact: null, client: cadastro })).toBe('31911112222');
    expect(bookingPhone({ clientContact: 'ana@cliente.test', client: cadastro })).toBe('31911112222');
    expect(bookingPhone({ clientContact: '31988887777', client: null })).toBe('31988887777');
    expect(bookingPhone({ clientContact: null, client: null })).toBeUndefined();
  });

  it('e-mail: o da reserva, depois o da conta, depois o contato quando é um e-mail', () => {
    expect(bookingEmail({ clientEmail: 'ana@cliente.test', client: cadastro })).toBe('ana@cliente.test');
    expect(bookingEmail({ clientEmail: null, client: cadastro })).toBe('conta@cliente.test');
    expect(bookingEmail({ clientEmail: null, clientContact: 'bia@cliente.test', client: null })).toBe('bia@cliente.test');
    expect(bookingEmail({ clientEmail: null, clientContact: '31988887777', client: null })).toBeUndefined();
  });

  it('número do wa.me: 10 ou 11 dígitos ganham o 55; com DDI fica como está; curto ou vazio não serve', () => {
    expect(toWhatsAppNumber('(31) 98888-7777')).toBe('5531988887777');
    expect(toWhatsAppNumber('(31) 3333-4444')).toBe('553133334444');
    expect(toWhatsAppNumber('+55 31 98888-7777')).toBe('5531988887777');
    expect(toWhatsAppNumber('+351 912 345 678')).toBe('351912345678');
    expect(toWhatsAppNumber('98888-7777')).toBeNull();
    expect(toWhatsAppNumber('')).toBeNull();
    expect(toWhatsAppNumber(undefined)).toBeNull();
  });
});
