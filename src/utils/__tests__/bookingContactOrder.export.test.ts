import { describe, it, expect } from 'vitest';
import { bookingsToSheetRows, type BookingExportSource } from '../bookingExport';

// Achado (auditoria ponta a ponta): a planilha de Reservas punha o e-mail e o telefone do cadastro
// antes dos informados na reserva. A reserva que a Proposta Rápida pendurou no cadastro de cliente do
// próprio admin (antes de 89ef066) saía com o telefone de OUTRO cliente (o da primeira proposta manual)
// e o e-mail da conta do admin. Mesma regra da ficha e do WhatsApp (utils/bookingContact).
const reservaNoCadastroDoAdmin: BookingExportSource = {
  id: 'XP-ANA-20270110', status: 'CONFIRMED', totalPrice: '300', eventDate: '2027-01-10T21:00:00.000Z',
  client: { id: 'cli-admin', phone: '31911112222', user: { id: 'a1', name: 'Dono da Empresa', email: 'dono@empresa.test' } },
  clientName: 'Ana Souza', clientContact: '(31) 98888-7777', clientEmail: 'ana@cliente.test',
};

const linha = (reserva: BookingExportSource) => bookingsToSheetRows([reserva])[0];

describe('bookingsToSheetRows — contato da reserva antes do cadastro', () => {
  it('reserva no cadastro do admin: telefone e e-mail informados na reserva', () => {
    expect(linha(reservaNoCadastroDoAdmin)).toMatchObject({ 'Telefone': '(31) 98888-7777', 'E-mail': 'ana@cliente.test' });
  });

  it('contato que é e-mail (orçamento do site sem telefone): telefone do cadastro', () => {
    expect(linha({ ...reservaNoCadastroDoAdmin, clientContact: 'ana@cliente.test' })).toMatchObject({
      'Telefone': '31911112222',
      'E-mail': 'ana@cliente.test',
    });
  });

  it('cliente cadastrado sem contato próprio na reserva: telefone e e-mail do cadastro', () => {
    expect(linha({ ...reservaNoCadastroDoAdmin, clientContact: null, clientEmail: null })).toMatchObject({
      'Telefone': '31911112222',
      'E-mail': 'dono@empresa.test',
    });
  });

  it('cadastro sem telefone e contato que é e-mail: o e-mail não vai para a coluna Telefone', () => {
    const semTelefone: BookingExportSource = {
      ...reservaNoCadastroDoAdmin,
      client: { id: 'cli-2', user: { id: 'u2', name: 'Bia Lima', email: 'bia@cliente.test' } },
      clientName: 'Bia Lima', clientContact: 'bia@cliente.test', clientEmail: null,
    };
    expect(linha(semTelefone)).toMatchObject({ 'Telefone': '', 'E-mail': 'bia@cliente.test' });
  });

  // Reserva sem cadastro (cliente digitado pelo admin ou importada do histórico) com e-mail no contato: o
  // e-mail saía na coluna Telefone e agora sai na E-mail; não pode sumir da planilha.
  it('reserva sem cadastro com contato que é e-mail: o e-mail sai na coluna E-mail', () => {
    const semCadastro: BookingExportSource = {
      ...reservaNoCadastroDoAdmin,
      client: undefined as unknown as BookingExportSource['client'],
      clientName: 'Bruno Lima', clientContact: 'bruno@cliente.test', clientEmail: null,
    };
    expect(linha(semCadastro)).toMatchObject({ 'Telefone': '', 'E-mail': 'bruno@cliente.test' });
  });
});
