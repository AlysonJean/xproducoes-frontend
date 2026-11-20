import { describe, it, expect } from 'vitest';
import { proposalBaseFromBooking } from '../proposalFromBooking';
import { NOT_DEFINED } from '../briefing';

// Auditoria completa (19/11/2026): o briefing sem local grava "A definir" (NOT_DEFINED) na rua, no bairro e no CEP.
// Copiado para a Proposta Rápida pelo "Montar orçamento", esse texto ia ao servidor como endereço, e o frete podia sair
// calculado para um lugar errado. "A definir" vira campo vazio.
describe('proposalBaseFromBooking — endereço "A definir"', () => {
  const BRIEFING_SEM_LOCAL = {
    id: 'XP-LUCAS-20261116-1430-8K2', status: 'PENDING', eventDate: '2026-12-05T22:00:00.000Z', location: NOT_DEFINED,
    street: NOT_DEFINED, addressNumber: '', neighborhood: NOT_DEFINED, city: 'Belo Horizonte', state: 'MG', zipCode: NOT_DEFINED,
    clientName: 'Lucas Prado', clientContact: '31977776666', items: [],
  };

  it('rua, bairro e CEP "A definir" viram vazios; cidade e UF de verdade ficam', () => {
    expect(NOT_DEFINED).toBe('A definir');
    expect(proposalBaseFromBooking(BRIEFING_SEM_LOCAL)).toMatchObject({
      street: '', addressNumber: '', neighborhood: '', zipCode: '', city: 'Belo Horizonte', state: 'MG',
    });
  });

  it('sem diferença de maiúsculas e espaços, e também no endereço antigo (venue)', () => {
    expect(proposalBaseFromBooking({ ...BRIEFING_SEM_LOCAL, street: '  a definir ', zipCode: 'A DEFINIR' })).toMatchObject({ street: '', zipCode: '' });
    const base = proposalBaseFromBooking({
      id: 'XP-ANA-1', status: 'PENDING', items: [],
      venue: { street: 'A definir', neighborhood: 'A definir', zipCode: 'A definir', city: 'Contagem', state: 'MG' },
    } as never);
    expect(base).toMatchObject({ street: '', neighborhood: '', zipCode: '', city: 'Contagem', state: 'MG' });
  });

  it('endereço de verdade que só contém as palavras continua igual', () => {
    expect(proposalBaseFromBooking({ ...BRIEFING_SEM_LOCAL, street: 'Rua A definir 2', neighborhood: 'Centro' })).toMatchObject({
      street: 'Rua A definir 2', neighborhood: 'Centro',
    });
  });
});
