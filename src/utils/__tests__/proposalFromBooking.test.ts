import { describe, it, expect } from 'vitest';
import { itemsLockedReason, proposalBaseFromBooking, proposalForBookingPath } from '../proposalFromBooking';

// 18/11/2026: "Montar orçamento" da ficha. A regra de quando os itens podem mudar é a do servidor
// (bookingCrudService.replacementForItems): proposta em aberto, fora do histórico e sem contrato aceito.
describe('itemsLockedReason', () => {
  it.each(['DRAFT', 'PENDING', undefined])('status %s: liberado', (status) => {
    expect(itemsLockedReason({ status })).toBeNull();
  });

  it.each(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED'])('status %s: travado, com o motivo', (status) => {
    expect(itemsLockedReason({ status })).toBe('Os itens só mudam com a proposta em aberto (rascunho ou pendente). Reserva confirmada, em andamento, concluída ou cancelada fica com os itens que tem.');
  });

  it('contrato aceito: travado; preparado ou desistido não trava', () => {
    expect(itemsLockedReason({ status: 'PENDING', contractSummary: { state: 'ACCEPTED', acceptedAt: '2026-11-17T04:00:00Z', withdrawUntil: null } }))
      .toBe('O cliente já aceitou o contrato desta reserva: os itens não mudam.');
    expect(itemsLockedReason({ status: 'PENDING', contractSummary: { state: 'PREPARED', acceptedAt: null, withdrawUntil: null } })).toBeNull();
  });

  it('reserva importada do histórico: travada', () => {
    expect(itemsLockedReason({ status: 'PENDING', idempotencyKey: 'HIST-2024-0001' })).toBe('Reserva importada do histórico: os itens dela não mudam.');
    expect(itemsLockedReason({ status: 'PENDING', idempotencyKey: 'abc-HIST-' })).toBeNull();
  });
});

describe('proposalBaseFromBooking', () => {
  const BRIEFING = {
    id: 'XP-LUCAS-20261116-1430-8K2', status: 'PENDING', eventTitle: 'Evento corporativo', location: 'Salão do hotel',
    eventDate: '2026-12-05T22:00:00.000Z', eventEndDate: '2026-12-06T03:00:00.000Z',
    street: ' Rua das Flores ', addressNumber: '45', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG', zipCode: '30810310',
    clientName: 'Lucas Prado', clientContact: '31977776666', clientEmail: 'lucas@cliente.test',
    specialRequests: '  Som para 150 pessoas.\nDois microfones.  ', items: [],
  };
  const local = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  it('tira da reserva o cliente, o briefing, as datas no horário do aparelho e o endereço', () => {
    expect(proposalBaseFromBooking(BRIEFING)).toEqual({
      id: BRIEFING.id, code: BRIEFING.id, clientName: 'Lucas Prado', clientPhone: '31977776666', clientEmail: 'lucas@cliente.test',
      briefing: 'Som para 150 pessoas.\nDois microfones.', itemCount: 0, lockedReason: null,
      eventTitle: 'Evento corporativo', location: 'Salão do hotel',
      eventDate: local(BRIEFING.eventDate), eventEndDate: local(BRIEFING.eventEndDate),
      street: 'Rua das Flores', addressNumber: '45', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG', zipCode: '30810310',
    });
  });

  it('cliente cadastrado: o nome e o contato do cadastro; endereço em venue; itens contados; sem término, o início', () => {
    const base = proposalBaseFromBooking({
      id: 'b0c1d2e3-0000-4000-8000-000000000001', status: 'CONFIRMED', eventDate: '2026-12-05T22:00:00.000Z',
      client: { id: 'c1', phone: '31955554444', user: { id: 'u1', name: 'Marina Costa', email: 'marina@cliente.test' } },
      venue: { street: 'Av. Brasil', addressNumber: '1', neighborhood: 'Funcionários', city: 'BH', state: 'MG', zipCode: '30140-000' },
      items: [{ description: 'Kit', totalPrice: 1 }, { description: 'Frete', totalPrice: 0 }],
    } as never);

    expect(base).toMatchObject({
      clientName: 'Marina Costa', clientPhone: '31955554444', clientEmail: 'marina@cliente.test', itemCount: 2,
      street: 'Av. Brasil', neighborhood: 'Funcionários', zipCode: '30140-000', briefing: '', location: '',
      eventEndDate: local('2026-12-05T22:00:00.000Z'),
    });
    expect(base.code).toMatch(/^#/);
    expect(base.lockedReason).toMatch(/proposta em aberto/);
  });

  it('o caminho da Proposta Rápida leva o código da reserva no endereço', () => {
    expect(proposalForBookingPath('XP-LUCAS 1/2')).toBe('/admin/orcamentos/novo?reserva=XP-LUCAS%201%2F2');
  });
});
