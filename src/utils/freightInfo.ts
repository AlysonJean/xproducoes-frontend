import { SITE_NAME } from '../data/site';
import { formatPrice } from './formatPrice';
import { kitFulfillment, type KitInfoLike } from './kitInfo';

// Frete por km (decisões do dono de 06/11/2026, item frete-km do lote 13). O site nunca calcula o frete: o
// cálculo consulta o Google, e a chave e a cota ficam só no servidor (backend/src/services/freight). O pedido de
// orçamento só explica a regra, com os valores que o servidor usa (GET /equipments/pricing-rules, campo
// freight), e o valor aparece na proposta.

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

/** "Frete calculado pela distância: grátis até 15 km da X Produções; acima disso, R$ 3,50 por km rodado. O valor aparece na proposta." */
export function freightRulesText(rules: FreightRules): string {
  return `Frete calculado pela distância: grátis até ${kmText(rules.freeKm)} km da ${SITE_NAME}; acima disso, ${formatPrice(rules.pricePerKm)} por km rodado. O valor aparece na proposta.`;
}

/** Há o que levar (kit de entrega e montagem ou equipamento avulso): só aí o servidor cobra frete. */
export function orderNeedsDelivery(kit: KitInfoLike | null | undefined, equipmentCount: number): boolean {
  return equipmentCount > 0 || (!!kit && kitFulfillment(kit) !== 'CLIENT_PICKUP');
}
