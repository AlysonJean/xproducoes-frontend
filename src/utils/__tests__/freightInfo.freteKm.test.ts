import { describe, it, expect } from 'vitest';
import { freightRulesText, orderNeedsDelivery, parseFreightRules } from '../freightInfo';
import { formatPrice } from '../formatPrice';

const PADRAO = { pricePerKm: 3.5, freeKm: 15, minimum: 50, roundTo: 10, trips: 2 };

// Frete por km (decisões do dono de 06/11/2026, item frete-km do lote 13): o site não calcula o frete; o pedido
// de orçamento só explica a regra com os valores que o servidor manda em GET /equipments/pricing-rules.
// Auditoria do orçamento (12/11/2026), E4 e O20: o texto dizia "grátis até 15 km" e "R$ 3,50 por km rodado", sem os 4
// trechos, o mínimo, o arredondamento, o pedágio e o kit de entrega. Agora traz a regra inteira da dona (12/11).
describe('freightInfo — a regra do frete no site', () => {
  it('lê as regras do servidor; sem elas (API anterior) ou estranhas, null', () => {
    expect(parseFreightRules(PADRAO)).toEqual(PADRAO);
    expect(parseFreightRules(undefined)).toBeNull();
    expect(parseFreightRules({ pricePerKm: '3,50', freeKm: 15 })).toBeNull();
    expect(parseFreightRules({ pricePerKm: 3.5, freeKm: -1 })).toBeNull();
  });

  it('o texto da regra nova, com os valores padrão do servidor', () => {
    expect(freightRulesText(PADRAO)).toBe(
      'Frete pela distância até o local do evento (a do trajeto de ida, em km inteiros, arredondada para o mais próximo; a volta conta igual). ' +
        `Equipamento avulso, sem kit de entrega: frete de ${formatPrice(50)} até 15 km da X Produções; acima disso, ${formatPrice(3.5)} por km além dos 15 km em cada trecho ` +
        `(4 trechos: 2 viagens de ida e volta), arredondado para cima em múltiplos de ${formatPrice(10)}, com mínimo de ${formatPrice(50)}. ` +
        'Pedido com kit de entrega, com ou sem equipamento avulso: até 15 km, o frete já vem no kit; acima disso, só os km além dos 15 km, pela mesma conta e sem mínimo. ' +
        'Pedágio, quando houver, à parte. Pedido só de serviços ou só com kit de retirada não tem frete. O valor aparece na proposta.',
    );
  });

  it('não promete frete grátis nem cobra só "por km rodado"', () => {
    const texto = freightRulesText(PADRAO);
    expect(texto).not.toMatch(/grátis/i);
    expect(texto).not.toContain('por km rodado');
  });

  it('acompanha os valores do servidor: raio, preço do km, mínimo, arredondamento e viagens', () => {
    const texto = freightRulesText({ pricePerKm: 4, freeKm: 20, minimum: 60, roundTo: 5, trips: 1 });
    expect(texto).toContain(`frete de ${formatPrice(60)} até 20 km da X Produções; acima disso, ${formatPrice(4)} por km além dos 20 km em cada trecho (2 trechos: 1 viagem de ida e volta)`);
    expect(texto).toContain(`múltiplos de ${formatPrice(5)}, com mínimo de ${formatPrice(60)}.`);
    expect(texto).toContain('Pedido com kit de entrega, com ou sem equipamento avulso: até 20 km, o frete já vem no kit');
  });

  it('sem mínimo nem arredondamento configurados: o texto não inventa os dois', () => {
    const texto = freightRulesText({ ...PADRAO, minimum: 0, roundTo: 0 });
    expect(texto).toContain('Equipamento avulso, sem kit de entrega: sem frete até 15 km da X Produções;');
    expect(texto).not.toContain('mínimo de');
    expect(texto).not.toContain('arredondado');
  });

  // Revisão (12/11/2026): o texto tem de bater com a conta do servidor. Kit de entrega + equipamento avulso usa a regra
  // do kit (freightMode), e os km de cada trecho são os da ida arredondados para o inteiro mais próximo (legKm): 15,4 km
  // conta 15 (sem km a mais) e 15,5 km conta 16.
  it('diz que o pedido com kit de entrega e equipamento junto segue a regra do kit, e como os km são contados', () => {
    const texto = freightRulesText(PADRAO);
    expect(texto).toContain('Equipamento avulso, sem kit de entrega:');
    expect(texto).toContain('Pedido com kit de entrega, com ou sem equipamento avulso:');
    expect(texto).toContain('(a do trajeto de ida, em km inteiros, arredondada para o mais próximo; a volta conta igual)');
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
