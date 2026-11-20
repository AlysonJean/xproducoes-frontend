import { describe, it, expect } from 'vitest';
import { bookingAddressText, bookingEquipmentNames, bookingItemCount, bookingKitNames } from '../clientBookingItems';

// Auditoria completa (19/11/2026): o GET /bookings/user manda os equipamentos já como objetos do catálogo
// (equipments[].name), o kit em `kit` e o endereço nos campos da reserva. As telas do cliente liam equipments[].equipment,
// kits[] e venue: todo equipamento virava "Equipamento", o kit não aparecia e o endereço não saía. As duas formas valem.
describe('utils/clientBookingItems', () => {
  it('equipamentos: o name do catálogo; na forma antiga, equipment.name; sem nome, "Equipamento"', () => {
    expect(bookingEquipmentNames({ equipments: [{ name: 'Caixa ativa 15 pol' }, { name: ' Microfone sem fio ' }] })).toEqual([
      'Caixa ativa 15 pol',
      'Microfone sem fio',
    ]);
    expect(bookingEquipmentNames({ equipments: [{ equipment: { name: 'Mesa de som 16 canais' } }] })).toEqual(['Mesa de som 16 canais']);
    expect(bookingEquipmentNames({ equipments: [{ name: '', equipment: { name: 'Refletor LED' } }, {}, null] })).toEqual([
      'Refletor LED',
      'Equipamento',
    ]);
    expect(bookingEquipmentNames({})).toEqual([]);
    expect(bookingEquipmentNames({ equipments: null })).toEqual([]);
  });

  it('kit: o campo `kit`; a forma antiga (kits[]) também; o mesmo kit nas duas aparece uma vez', () => {
    expect(bookingKitNames({ kit: { name: 'Kit 05' } })).toEqual(['Kit 05']);
    expect(bookingKitNames({ kits: [{ kit: { name: 'Kit 08' } }] })).toEqual(['Kit 08']);
    expect(bookingKitNames({ kit: { name: 'Kit 05' }, kits: [{ kit: { name: 'Kit 05' } }, null] })).toEqual(['Kit 05']);
    expect(bookingKitNames({ kit: null, kits: [] })).toEqual([]);
    expect(bookingKitNames({ kit: { name: '  ' } })).toEqual([]);
  });

  it('contagem: kit mais equipamentos avulsos (a reserva só de kit tem 1 item)', () => {
    expect(bookingItemCount({ kit: { name: 'Kit 05' }, equipments: [] })).toBe(1);
    expect(bookingItemCount({ kit: { name: 'Kit 05' }, equipments: [{ name: 'Caixa' }, { name: 'Microfone' }] })).toBe(3);
    expect(bookingItemCount({ equipments: [] })).toBe(0);
  });

  it('endereço: os campos da reserva (rua, número, bairro, cidade - UF, CEP)', () => {
    expect(
      bookingAddressText({
        street: 'Rua A', addressNumber: '10', neighborhood: 'Savassi', city: 'Belo Horizonte', state: 'MG', zipCode: '30140-000',
      }),
    ).toBe('Rua A, 10, Savassi, Belo Horizonte - MG, CEP 30140-000');
    expect(bookingAddressText({ city: 'Contagem', state: 'MG' })).toBe('Contagem - MG');
    expect(bookingAddressText({ addressNumber: '10' })).toBe('');
  });

  it('endereço na forma antiga (venue) continua lido; os campos da reserva têm a preferência', () => {
    expect(bookingAddressText({ venue: { street: 'Av. Brasil', city: 'BH', state: 'MG', zipCode: '30140-001' } })).toBe(
      'Av. Brasil, BH - MG, CEP 30140-001',
    );
    expect(bookingAddressText({ street: 'Rua Nova', venue: { street: 'Rua Velha', city: 'BH' } })).toBe('Rua Nova, BH');
    expect(bookingAddressText({})).toBe('');
  });
});
