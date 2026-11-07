import { describe, it, expect } from 'vitest';
import { formatBRL, kitPriceLine, type KitPricingInput } from '../bookingPricing';
import { kitCompactInfo, kitFulfillment, kitHours } from '../kitInfo';

// Lote 13, campos do kit (aprovados pelo dono em 06/11/2026): a linha do kit do site é a mesma do servidor
// (kitPriceLine em backend/src/services/booking/bookingPricing.ts). Mesmo vetor de casos do teste do backend
// (src/utils/__tests__/kitCampos.precoHoraExtra.test.ts): a Proposta Rápida manda a linha calculada aqui, e a
// estimativa do orçamento do site usa a mesma conta. `horas` são as horas cheias do evento (hoursBetween).
const COMBO = { name: 'Combo Club', price: '149.99' };
const VETOR_KIT: Array<{ nome: string; kit: Record<string, unknown>; horas: number | null; esperado: { description: string; cents: number; extraHours: number } }> = [
  {
    nome: 'sem horas incluídas: o preço do evento, qualquer duração',
    kit: { ...COMBO, minimumRentalDuration: null, extraHourPrice: '50.00' },
    horas: 12,
    esperado: { description: 'Combo Club', cents: 14999, extraHours: 0 },
  },
  {
    nome: 'evento dentro das horas incluídas: sem hora extra',
    kit: { ...COMBO, minimumRentalDuration: 4, extraHourPrice: '50.00' },
    horas: 4,
    esperado: { description: 'Combo Club (4 h incluídas)', cents: 14999, extraHours: 0 },
  },
  {
    nome: '4 h incluídas e evento de 6,5 h (7 h cheias): 3 horas extras, em centavos',
    kit: { ...COMBO, minimumRentalDuration: 4, extraHourPrice: '33.33' },
    horas: 7,
    esperado: { description: 'Combo Club (4 h incluídas + 3 horas extras de R$ 33,33)', cents: 14999 + 3 * 3333, extraHours: 3 },
  },
  {
    nome: 'uma hora extra, no singular',
    kit: { ...COMBO, minimumRentalDuration: 4, extraHourPrice: 50 },
    horas: 5,
    esperado: { description: 'Combo Club (4 h incluídas + 1 hora extra de R$ 50,00)', cents: 19999, extraHours: 1 },
  },
  {
    nome: 'sem valor de hora extra: só as horas incluídas, qualquer duração',
    kit: { ...COMBO, minimumRentalDuration: 4, extraHourPrice: null },
    horas: 10,
    esperado: { description: 'Combo Club (4 h incluídas)', cents: 14999, extraHours: 0 },
  },
  {
    nome: 'valor de hora extra zero: sem cobrança',
    kit: { ...COMBO, minimumRentalDuration: 4, extraHourPrice: '0.00' },
    horas: 10,
    esperado: { description: 'Combo Club (4 h incluídas)', cents: 14999, extraHours: 0 },
  },
  {
    nome: 'retirada e montagem pelo cliente: dito na descrição, com as horas extras',
    kit: { ...COMBO, minimumRentalDuration: 4, extraHourPrice: '50.00', fulfillment: 'CLIENT_PICKUP' },
    horas: 6,
    esperado: { description: 'Combo Club (4 h incluídas + 2 horas extras de R$ 50,00; retirada e montagem pelo cliente)', cents: 24999, extraHours: 2 },
  },
  {
    nome: 'retirada sem horas incluídas',
    kit: { ...COMBO, fulfillment: 'CLIENT_PICKUP' },
    horas: 3,
    esperado: { description: 'Combo Club (retirada e montagem pelo cliente)', cents: 14999, extraHours: 0 },
  },
  {
    nome: 'entrega e montagem pela equipe (o padrão) não muda a descrição',
    kit: { ...COMBO, minimumRentalDuration: 4, fulfillment: 'DELIVERY_SETUP' },
    horas: 2,
    esperado: { description: 'Combo Club (4 h incluídas)', cents: 14999, extraHours: 0 },
  },
  {
    nome: 'sem as datas (no site): não conta hora extra',
    kit: { ...COMBO, minimumRentalDuration: 4, extraHourPrice: '50.00' },
    horas: null,
    esperado: { description: 'Combo Club (4 h incluídas)', cents: 14999, extraHours: 0 },
  },
  {
    nome: 'hora extra acima de mil reais, com o ponto do milhar',
    kit: { ...COMBO, minimumRentalDuration: 2, extraHourPrice: '1234.5' },
    horas: 4,
    esperado: { description: 'Combo Club (2 h incluídas + 2 horas extras de R$ 1.234,50)', cents: 14999 + 246900, extraHours: 2 },
  },
];

describe('kitPriceLine (site) — a mesma linha do kit do servidor', () => {
  it.each(VETOR_KIT)('$nome', ({ kit, horas, esperado }) => {
    expect(kitPriceLine(kit as KitPricingInput, horas)).toEqual(esperado);
  });

  it('R$ na descrição como o servidor escreve, sem espaço não separável', () => {
    expect(formatBRL(5000)).toBe('R$ 50,00');
    expect(formatBRL(123456789)).toBe('R$ 1.234.567,89');
    expect(formatBRL(5)).toBe('R$ 0,05');
  });
});

// O que o site mostra do kit segue o mesmo critério da conta: a hora extra só aparece quando a reserva a cobra.
describe('kitInfo — horas, hora extra e tipo para mostrar', () => {
  it('hora extra só com horas incluídas, os dois maiores que zero (o Decimal chega como texto)', () => {
    expect(kitHours({ minimumRentalDuration: 4, extraHourPrice: '50.00' })).toEqual({ included: 4, extraHourPrice: 50 });
    expect(kitHours({ minimumRentalDuration: null, extraHourPrice: '80.00' })).toEqual({ included: null, extraHourPrice: null });
    expect(kitHours({ minimumRentalDuration: 4, extraHourPrice: '0' })).toEqual({ included: 4, extraHourPrice: null });
  });

  it('tipo: sem o campo, o padrão do banco (entrega e montagem); resumo curto para o cartão e o carrinho', () => {
    expect(kitFulfillment({})).toBe('DELIVERY_SETUP');
    expect(kitFulfillment({ fulfillment: 'CLIENT_PICKUP' })).toBe('CLIENT_PICKUP');
    expect(kitCompactInfo({ minimumRentalDuration: 4, fulfillment: 'CLIENT_PICKUP' })).toBe('4 h incluídas · Retirada pelo cliente');
    expect(kitCompactInfo({})).toBe('Entrega e montagem');
  });
});
