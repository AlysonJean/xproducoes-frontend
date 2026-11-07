import { describe, it, expect } from 'vitest';
import { serviceLine, serviceMinutesText } from '../bookingPricing';
import { isWholeEventService, wholeEventRuleText } from '../wholeEventService';

// Lote 13, técnico durante o evento (decisão do dono de 06/11/2026): "o preço do serviço cobre as horas cadastradas
// nele; cada hora a mais sai proporcional" (Técnico de Som e Operação Profissional, R$ 300 por 180 min: evento de até
// 3 h = R$ 300, de 6 h = R$ 600, de 8 h = R$ 800). A linha do serviço do site é a mesma do servidor (serviceLine em
// backend/src/services/booking/bookingPricing.ts). Mesmo vetor de casos do teste do backend
// (src/utils/__tests__/tecnicoEvento.precoDoTecnico.test.ts): a Proposta Rápida manda a linha calculada aqui, e a
// estimativa do pedido do site usa a mesma conta. `horas` são as horas cheias do evento (hoursBetween).
const TECNICO = { name: 'Técnico de Som e Operação Profissional', price: '300.00', duration: 180, coversWholeEvent: true };
const VETOR_SERVICO: Array<{ nome: string; servico: Record<string, unknown>; horas: number | null; esperado: { description: string; cents: number } }> = [
  {
    nome: '180 min e evento de 2 h: o preço cadastrado',
    servico: TECNICO,
    horas: 2,
    esperado: { description: 'Técnico de Som e Operação Profissional (até 3 h de evento)', cents: 30000 },
  },
  {
    nome: '180 min e evento de 3 h: o preço cadastrado',
    servico: TECNICO,
    horas: 3,
    esperado: { description: 'Técnico de Som e Operação Profissional (até 3 h de evento)', cents: 30000 },
  },
  {
    nome: '180 min e evento de 6 h: R$ 600 (o exemplo do dono)',
    servico: TECNICO,
    horas: 6,
    esperado: { description: 'Técnico de Som e Operação Profissional (6 h de evento: 3 h incluídas + 3 h a mais)', cents: 60000 },
  },
  {
    nome: '180 min e evento de 8 h: R$ 800',
    servico: TECNICO,
    horas: 8,
    esperado: { description: 'Técnico de Som e Operação Profissional (8 h de evento: 3 h incluídas + 5 h a mais)', cents: 80000 },
  },
  {
    nome: '90 min, R$ 250 e evento de 2 h: proporcional, arredondado no centavo',
    servico: { name: 'Técnico de Luz', price: '250.00', duration: 90, coversWholeEvent: true },
    horas: 2,
    esperado: { description: 'Técnico de Luz (2 h de evento: 1 h 30 min incluídos + 30 min a mais)', cents: 33333 },
  },
  {
    nome: '90 min, R$ 199,99 e evento de 4 h: arredonda para cima no meio centavo',
    servico: { name: 'Técnico de Luz', price: 199.99, duration: 90, coversWholeEvent: true },
    horas: 4,
    esperado: { description: 'Técnico de Luz (4 h de evento: 1 h 30 min incluídos + 2 h 30 min a mais)', cents: 53331 },
  },
  {
    nome: '60 min: 1 h incluída, no singular',
    servico: { name: 'Operador', price: 100, duration: 60, coversWholeEvent: true },
    horas: 3,
    esperado: { description: 'Operador (3 h de evento: 1 h incluída + 2 h a mais)', cents: 30000 },
  },
  {
    nome: '30 min e evento de 2 h: quatro vezes o preço',
    servico: { name: 'Operador', price: '50.00', duration: 30, coversWholeEvent: true },
    horas: 2,
    esperado: { description: 'Operador (2 h de evento: 30 min incluídos + 1 h 30 min a mais)', cents: 20000 },
  },
  {
    nome: 'acima de mil reais',
    servico: { name: 'Equipe Técnica', price: '1500.00', duration: 240, coversWholeEvent: true },
    horas: 10,
    esperado: { description: 'Equipe Técnica (10 h de evento: 4 h incluídas + 6 h a mais)', cents: 375000 },
  },
  {
    nome: 'duração nula: preço fixo, como hoje',
    servico: { ...TECNICO, duration: null },
    horas: 6,
    esperado: { description: 'Técnico de Som e Operação Profissional', cents: 30000 },
  },
  {
    nome: 'duração zero: preço fixo, como hoje',
    servico: { ...TECNICO, duration: 0 },
    horas: 6,
    esperado: { description: 'Técnico de Som e Operação Profissional', cents: 30000 },
  },
  {
    nome: 'serviço não marcado (DJ): preço fixo e o nome, qualquer duração',
    servico: { name: 'DJ Profissional', price: '800.00', duration: 180, coversWholeEvent: false },
    horas: 8,
    esperado: { description: 'DJ Profissional', cents: 80000 },
  },
  {
    nome: 'sem a marcação (resposta antiga): preço fixo',
    servico: { name: 'Logística', price: '150.00', duration: 60 },
    horas: 8,
    esperado: { description: 'Logística', cents: 15000 },
  },
  {
    nome: 'sem as horas (o site sem a duração): o preço cadastrado',
    servico: TECNICO,
    horas: null,
    esperado: { description: 'Técnico de Som e Operação Profissional (até 3 h de evento)', cents: 30000 },
  },
];

describe('serviceLine — o serviço que acompanha o evento todo (mesmo vetor do servidor)', () => {
  it.each(VETOR_SERVICO)('$nome', ({ servico, horas, esperado }) => {
    expect(serviceLine(servico as never, horas)).toEqual(esperado);
  });

  it('as horas cadastradas em palavras', () => {
    expect(serviceMinutesText(180)).toBe('3 h');
    expect(serviceMinutesText(90)).toBe('1 h 30 min');
    expect(serviceMinutesText(30)).toBe('30 min');
  });
});

describe('caixa do técnico no pedido', () => {
  it('a regra em palavras; com o evento além das horas cadastradas, o valor do evento', () => {
    expect(wholeEventRuleText(TECNICO, null)).toMatch(/^R\$\s300,00 até 3 h de evento; cada hora a mais sai proporcional\.$/);
    expect(wholeEventRuleText(TECNICO, 3)).toMatch(/^R\$\s300,00 até 3 h de evento; cada hora a mais sai proporcional\.$/);
    expect(wholeEventRuleText(TECNICO, 6)).toMatch(/^R\$\s300,00 até 3 h de evento; cada hora a mais sai proporcional\. No seu evento de 6 h: R\$\s600,00\.$/);
    expect(wholeEventRuleText({ ...TECNICO, duration: 0 }, 6)).toMatch(/^R\$\s300,00\.$/);
  });

  it('entra na caixa só o serviço marcado e ativo (o servidor recusa serviço inativo no pedido do cliente)', () => {
    expect(isWholeEventService({ coversWholeEvent: true, status: 'ACTIVE' })).toBe(true);
    expect(isWholeEventService({ coversWholeEvent: true })).toBe(true);
    expect(isWholeEventService({ coversWholeEvent: false, status: 'ACTIVE' })).toBe(false);
    expect(isWholeEventService({ status: 'ACTIVE' })).toBe(false);
    for (const status of ['INACTIVE', 'MAINTENANCE', 'COMING_SOON']) expect(isWholeEventService({ coversWholeEvent: true, status })).toBe(false);
  });
});
