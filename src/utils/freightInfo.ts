import { SITE_NAME } from '../data/site';
import { formatPrice } from './formatPrice';
import { kitFulfillment, type KitInfoLike } from './kitInfo';

// Frete por km (decisões do dono de 06/11/2026, item frete-km do lote 13). O site nunca calcula o frete: o
// cálculo consulta o Google, e a chave e a cota ficam só no servidor (backend/src/services/freight). O pedido de
// orçamento só explica a regra, com os valores que o servidor usa (GET /equipments/pricing-rules, campo
// freight), e o valor aparece na proposta.
// Auditoria do orçamento (12/11/2026), E4 e O20 (decisão da dona de 12/11): acabou o "grátis até 15 km". Equipamento
// avulso (sem kit de entrega) paga o mínimo (R$ 50) até 15 km; acima, os km a mais em cada trecho (4 trechos),
// arredondados para cima, com o mínimo. Com kit de entrega (com ou sem equipamento junto), até 15 km vem no kit e,
// acima, só os km a mais, sem mínimo. Km inteiros da ida (a volta conta igual). Pedágio à parte; só serviços ou só
// kit de retirada, sem frete. A mesma conta do servidor (services/freight/freightPricing.ts).

export interface FreightRules {
  pricePerKm: number;
  freeKm: number;
  minimum: number;
  roundTo: number;
  trips: number;
}

const amount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

/** As regras do frete da resposta da API; null quando faltam (API anterior) ou vêm estranhas. */
export function parseFreightRules(raw: unknown): FreightRules | null {
  if (!raw || typeof raw !== 'object') return null;
  const rules = raw as Record<string, unknown>;
  const pricePerKm = amount(rules.pricePerKm);
  const freeKm = amount(rules.freeKm);
  if (pricePerKm === null || freeKm === null) return null;
  return {
    pricePerKm,
    freeKm,
    minimum: amount(rules.minimum) ?? 0,
    roundTo: amount(rules.roundTo) ?? 0,
    trips: amount(rules.trips) ?? 2,
  };
}

const kmText = (km: number) => (Number.isInteger(km) ? String(km) : km.toFixed(1).replace('.', ','));

/**
 * A regra inteira do frete, com os valores do servidor. Com os padrões: "Frete pela distância até o local do evento
 * (a do trajeto de ida, em km inteiros, arredondada para o mais próximo; a volta conta igual). Equipamento avulso, sem
 * kit de entrega: frete de R$ 50,00 até 15 km da X Produções; acima disso, R$ 3,50 por km além dos 15 km em cada
 * trecho (4 trechos: 2 viagens de ida e volta), arredondado para cima em múltiplos de R$ 10,00, com mínimo de
 * R$ 50,00. Pedido com kit de entrega, com ou sem equipamento avulso: até 15 km, o frete já vem no kit; acima disso,
 * só os km além dos 15 km, pela mesma conta e sem mínimo. Pedágio, quando houver, à parte. Pedido só de serviços ou só
 * com kit de retirada não tem frete. O valor aparece na proposta."
 * Auditoria do orçamento (12/11/2026), E4: o texto diz qual regra vale com kit de entrega e equipamento juntos (a do
 * kit, como freightMode no servidor) e como os km são contados (legKm), para bater com a conta também em 15,5 km.
 */
export function freightRulesText(rules: FreightRules): string {
  const km = kmText(rules.freeKm);
  const legs = rules.trips * 2;
  const trips = `${rules.trips} ${rules.trips === 1 ? 'viagem' : 'viagens'} de ida e volta`;
  const rounding = rules.roundTo > 0 ? `, arredondado para cima em múltiplos de ${formatPrice(rules.roundTo)}` : '';
  const perKm = `${formatPrice(rules.pricePerKm)} por km além dos ${km} km em cada trecho (${legs} ${legs === 1 ? 'trecho' : 'trechos'}: ${trips})${rounding}`;
  const distance = 'Frete pela distância até o local do evento (a do trajeto de ida, em km inteiros, arredondada para o mais próximo; a volta conta igual).';
  const equipment = rules.minimum > 0
    ? `Equipamento avulso, sem kit de entrega: frete de ${formatPrice(rules.minimum)} até ${km} km da ${SITE_NAME}; acima disso, ${perKm}, com mínimo de ${formatPrice(rules.minimum)}.`
    : `Equipamento avulso, sem kit de entrega: sem frete até ${km} km da ${SITE_NAME}; acima disso, ${perKm}.`;
  const kit = `Pedido com kit de entrega, com ou sem equipamento avulso: até ${km} km, o frete já vem no kit; acima disso, só os km além dos ${km} km, pela mesma conta e sem mínimo.`;
  return `${distance} ${equipment} ${kit} Pedágio, quando houver, à parte. Pedido só de serviços ou só com kit de retirada não tem frete. O valor aparece na proposta.`;
}

/** Há o que levar (kit de entrega e montagem ou equipamento avulso): só aí o servidor cobra frete. */
export function orderNeedsDelivery(kit: KitInfoLike | null | undefined, equipmentCount: number): boolean {
  return equipmentCount > 0 || (!!kit && kitFulfillment(kit) !== 'CLIENT_PICKUP');
}
