import { describe, it, expect } from 'vitest';
import { freightRulesText, orderNeedsDelivery, parseFreightRules } from '../freightInfo';
import { formatPrice } from '../formatPrice';

// Frete por km (decisões do dono de 06/11/2026, item frete-km do lote 13): o site não calcula o frete; o pedido
// de orçamento só explica a regra com os valores que o servidor manda em GET /equipments/pricing-rules.
describe('freightInfo — a regra do frete no site', () => {
  it('lê as regras do servidor; sem elas (API anterior) ou estranhas, null', () => {
    expect(parseFreightRules({ pricePerKm: 3.5, freeKm: 15, minimum: 50, roundTo: 10, trips: 2 })).toEqual({ pricePerKm: 3.5, freeKm: 15, minimum: 50, roundTo: 10, trips: 2 });
    expect(parseFreightRules(undefined)).toBeNull();
    expect(parseFreightRules({ pricePerKm: '3,50', freeKm: 15 })).toBeNull();
    expect(parseFreightRules({ pricePerKm: 3.5, freeKm: -1 })).toBeNull();
  });

  it('o texto aprovado, com os valores do servidor', () => {
    expect(freightRulesText({ pricePerKm: 3.5, freeKm: 15, minimum: 50, roundTo: 10, trips: 2 })).toBe(
      `Frete calculado pela distância: grátis até 15 km da X Produções; acima disso, ${formatPrice(3.5)} por km rodado. O valor aparece na proposta.`,
    );
    expect(freightRulesText({ pricePerKm: 4, freeKm: 20, minimum: 50, roundTo: 10, trips: 2 })).toContain(`grátis até 20 km da X Produções; acima disso, ${formatPrice(4)} por km`);
  });

  it('só há frete quando há o que levar: kit de entrega ou equipamento', () => {
    expect(orderNeedsDelivery({ fulfillment: 'DELIVERY_SETUP' }, 0)).toBe(true);
    expect(orderNeedsDelivery({}, 0)).toBe(true);
    expect(orderNeedsDelivery(undefined, 1)).toBe(true);
    expect(orderNeedsDelivery({ fulfillment: 'CLIENT_PICKUP' }, 1)).toBe(true);
    expect(orderNeedsDelivery({ fulfillment: 'CLIENT_PICKUP' }, 0)).toBe(false);
    expect(orderNeedsDelivery(null, 0)).toBe(false);
  });
});
