// Teste do painel admin de 25/11/2026 (relatório "Teste do painel admin — 25/11/2026"): as regras puras dos consertos.
// - A-09/A-11: os campos da Proposta rápida (telefone, e-mail, datas, CEP, UF), todos de uma vez;
// - A-16/M-01: a ordem padrão da lista de Reservas (próximos eventos primeiro);
// - A-14: a busca sem acento;
// - A-02: o resumo do card "A receber" com as parciais sem o valor recebido.
import { describe, it, expect } from 'vitest';
import { fieldErrorsSummary, isBrazilPhone, PROPOSAL_FIELD_ORDER, proposalFieldErrors, type ProposalFieldValues } from '../quickProposalFields';
import { upcomingFirst } from '../bookingListOrder';
import { searchText } from '../string';
import { bookingMatchesSearch } from '../bookingSearch';
import { receivablesText } from '../bookingStatus';

const NOW = new Date('2026-11-25T12:00:00-03:00');
const valid: ProposalFieldValues = {
  clientName: 'Ana Souza', clientContact: '(31) 98888-7777', clientEmail: 'ana@cliente.test', location: 'Espaço VIP',
  eventDate: '2027-01-09T19:00', eventEndDate: '2027-01-09T23:00',
  zipCode: '30130-010', street: 'Av. Afonso Pena', addressNumber: '1000', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG',
};

describe('A-09/A-11: campos da Proposta rápida', () => {
  it('tudo certo: nenhum erro', () => {
    expect(proposalFieldErrors(valid, { manualClient: true, now: NOW })).toEqual({});
  });

  it('os valores do teste (e-mail "abc@", telefone "123", data de ontem, CEP 00000-000) dão um erro em cada campo, de uma vez', () => {
    const errors = proposalFieldErrors(
      { ...valid, clientEmail: 'abc@', clientContact: '123', eventDate: '2026-11-24T19:00', eventEndDate: '2026-11-24T23:00', zipCode: '00000-000' },
      { manualClient: true, now: NOW },
    );
    expect(errors).toEqual({
      clientEmail: 'E-mail inválido. Confira, por exemplo: nome@gmail.com.',
      clientContact: 'Telefone inválido. Digite com o DDD, por exemplo (31) 98888-7777.',
      eventDate: 'O início já passou. Confira a data e a hora do evento.',
      zipCode: 'CEP inválido. Digite os 8 números, por exemplo 30130-010.',
    });
    expect(fieldErrorsSummary(errors)).toBe('4 campos para corrigir, marcados em vermelho.');
  });

  it('término antes do início: o erro é do término, com a frase certa (não "Campo obrigatório")', () => {
    expect(proposalFieldErrors({ ...valid, eventEndDate: '2027-01-09T18:00' }, { manualClient: true, now: NOW })).toEqual({
      eventEndDate: 'O término precisa ser depois do início.',
    });
  });

  it('tudo vazio: cada campo diz o que falta, na ordem da tela', () => {
    const empty = Object.fromEntries(Object.keys(valid).map((k) => [k, ''])) as unknown as ProposalFieldValues;
    const errors = proposalFieldErrors(empty, { manualClient: true, now: NOW });
    expect(Object.keys(errors)).toEqual(PROPOSAL_FIELD_ORDER.filter((f) => f !== 'clientEmail'));
    expect(errors.addressNumber).toBe('Informe o número (ou "s/n").');
    expect(fieldErrorsSummary({ city: 'x' })).toBe('1 campo para corrigir, marcado em vermelho.');
  });

  it('cliente cadastrado (ou o da reserva): os campos do cliente digitado não contam', () => {
    expect(proposalFieldErrors({ ...valid, clientName: '', clientContact: '', clientEmail: 'x' }, { manualClient: false, now: NOW })).toEqual({});
  });

  it('UF: só a sigla de um estado', () => {
    expect(proposalFieldErrors({ ...valid, state: 'XX' }, { manualClient: false, now: NOW }).state).toBe('Use a sigla do estado, por exemplo MG.');
    expect(proposalFieldErrors({ ...valid, state: 'sp' }, { manualClient: false, now: NOW }).state).toBeUndefined();
  });

  it.each([
    ['(31) 98888-7777', true], ['31988887777', true], ['+55 31 98888-7777', true], ['3133334444', true],
    ['123', false], ['988887777', false], ['(01) 98888-7777', false], ['5531988887777000', false],
  ])('telefone %s → %s', (phone, ok) => {
    expect(isBrazilPhone(phone)).toBe(ok);
  });
});

describe('A-16/M-01: próximos eventos primeiro', () => {
  it('de hoje em diante o mais perto antes; depois os que passaram, o mais recente antes; sem data no fim', () => {
    const now = Date.parse('2026-11-25T12:00:00Z');
    const list = [
      { id: '2022', eventDate: '2022-05-01T20:00:00Z' },
      { id: 'sem-data', eventDate: null },
      { id: 'jan', eventDate: '2027-01-09T22:00:00Z' },
      { id: 'ontem', eventDate: '2026-11-24T22:00:00Z' },
      { id: 'sabado', eventDate: '2026-11-28T22:00:00Z' },
    ];
    expect(upcomingFirst(list, now).map((b) => b.id)).toEqual(['sabado', 'jan', 'ontem', '2022', 'sem-data']);
    expect(list[0].id).toBe('2022'); // não muda a lista original
  });
});

describe('A-14: busca sem acento', () => {
  it('searchText tira acento, maiúscula e espaços das pontas', () => {
    expect(searchText('  João FUMAÇA ')).toBe('joao fumaca');
    expect(searchText(null)).toBe('');
  });

  it('"Joao" acha "João" e "joão" acha "Joao" na lista de reservas', () => {
    const booking = { id: 'XP-1', clientName: 'João Silva', location: 'Salão' };
    expect(bookingMatchesSearch(booking, 'Joao')).toBe(true);
    expect(bookingMatchesSearch({ ...booking, clientName: 'Joao Silva' }, 'joão')).toBe(true);
    expect(bookingMatchesSearch(booking, 'Maria')).toBe(false);
  });
});

describe('A-02: o resumo do card "A receber"', () => {
  it('com parcial sem o valor recebido: diz quantas, até quanto e onde lançar', () => {
    expect(receivablesText({ noPaymentCount: 0, partialCount: 1, overdueBalanceCount: 0, partialUnknownCount: 1, partialUnknownTotal: 2160 }))
      .toMatch(/^0 sem pagamento registrado · 1 só com o sinal · 1 parcial sem o valor recebido \(até R\$\s2\.160,00\): lance em Editar$/);
    expect(receivablesText({ noPaymentCount: 2, partialCount: 3, overdueBalanceCount: 1, partialUnknownCount: 2, partialUnknownTotal: 0 }))
      .toBe('2 sem pagamento registrado · 3 só com o sinal · 1 com o saldo vencido · 2 parciais sem o valor recebido: lance em Editar');
  });

  it('sem parcial desconhecida, o resumo de antes', () => {
    expect(receivablesText({ noPaymentCount: 1, partialCount: 0, overdueBalanceCount: 0, partialUnknownCount: 0 })).toBe('1 sem pagamento registrado · 0 só com o sinal');
  });
});
