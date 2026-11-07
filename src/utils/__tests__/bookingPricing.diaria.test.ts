import { describe, it, expect } from 'vitest';
import { equipmentUnits, equipmentUnitsForHours, equipmentUnitText, equipmentUnitSuffix, priceUnitOf } from '../bookingPricing';

// Lote 13, diária nas telas (decisão do dono de 06/11). O orçamento do site pede a duração em horas, não o
// término; a conta tem de ser a do servidor (backend/src/services/booking/bookingPricing.ts, equipmentUnits):
// horas cheias, ou diárias de 24 h para cima com o mínimo de diárias do cadastro. Antes o orçamento contava
// as diárias sem o mínimo do equipamento (30 h com mínimo de 3 diárias davam 2).
describe('equipmentUnitsForHours — a conta do servidor pela duração', () => {
  it.each([
    ['hour', 5, null, 5],
    ['hour', 4.5, null, 5], // 4,5 h contam 5 h, como o servidor
    ['hour', 0.5, null, 1],
    ['day', 5, null, 1],
    ['day', 24, null, 1],
    ['day', 30, null, 2], // 30 h = 2 diárias
    ['day', 48, null, 2],
    ['day', 49, null, 3],
    ['day', 30, 3, 3], // mínimo de 3 diárias no cadastro
    ['day', 80, 3, 4],
    ['hour', 2, 3, 2], // na hora, o mínimo do cadastro não entra (igual ao servidor)
  ] as const)('%s, %s h, mínimo %s → %s', (unit, hours, minimum, expected) => {
    expect(equipmentUnitsForHours(unit, hours, minimum)).toBe(expected);
  });

  it('é a mesma conta de equipmentUnits com início e término', () => {
    const start = '2027-01-10T18:00:00.000Z';
    for (const hours of [1, 4.5, 23, 24, 25, 30, 47, 49, 72]) {
      const end = new Date(new Date(start).getTime() + hours * 3600 * 1000).toISOString();
      for (const unit of ['hour', 'day'] as const) {
        expect(equipmentUnitsForHours(unit, hours, 2)).toBe(equipmentUnits(unit, start, end, 2));
      }
    }
  });

  it('sem duração positiva: null (o orçamento mostra 0 até a pessoa digitar)', () => {
    expect(equipmentUnitsForHours('day', 0)).toBeNull();
    expect(equipmentUnitsForHours('hour', -3)).toBeNull();
    expect(equipmentUnitsForHours('day', Number.NaN)).toBeNull();
  });

  it('textos da unidade, como o servidor: "1 diária", "2 diárias", "5 h" e os sufixos "/diária" e "/h"', () => {
    expect(equipmentUnitText(1, 'day')).toBe('1 diária');
    expect(equipmentUnitText(2, 'day')).toBe('2 diárias');
    expect(equipmentUnitText(5, 'hour')).toBe('5 h');
    expect(equipmentUnitSuffix('day')).toBe('/diária');
    expect(equipmentUnitSuffix('hour')).toBe('/h');
  });
});

describe('priceUnitOf — a unidade que o servidor pôs no equipamento', () => {
  it('lê só "hour" ou "day"; qualquer outra coisa (ou sem o campo) é null, e a tela usa a chave do servidor', () => {
    expect(priceUnitOf({ priceUnit: 'day' })).toBe('day');
    expect(priceUnitOf({ priceUnit: 'hour' })).toBe('hour');
    expect(priceUnitOf({ priceUnit: 'DAY' })).toBeNull();
    expect(priceUnitOf({ pricePerHour: 10 })).toBeNull();
    expect(priceUnitOf(null)).toBeNull();
    expect(priceUnitOf(undefined)).toBeNull();
  });
});
