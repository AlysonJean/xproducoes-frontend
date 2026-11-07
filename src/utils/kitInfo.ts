import type { KitFulfillment } from './bookingPricing';
import { toNumber } from './typeSafeFormatters';

// Lote 13, campos do kit (aprovados pelo dono em 06/11/2026: "cada kit é de um tipo"; "eu ajusto as horas na
// criação do kit"): o site diz o tipo de cada kit e, quando o kit tem, as horas incluídas no preço e o valor
// da hora extra. A hora extra só aparece quando o kit tem horas incluídas e valor de hora extra, os dois
// maiores que zero: é quando a conta do servidor (kitPriceLine) a cobra.

export const KIT_FULFILLMENT_LABEL: Record<KitFulfillment, string> = {
  DELIVERY_SETUP: 'Entrega e montagem pela equipe',
  CLIENT_PICKUP: 'Retirada e montagem pelo cliente',
};

/** Rótulo curto, para o cartão e o carrinho. */
export const KIT_FULFILLMENT_SHORT: Record<KitFulfillment, string> = {
  DELIVERY_SETUP: 'Entrega e montagem',
  CLIENT_PICKUP: 'Retirada pelo cliente',
};

/** A frase da página do kit. A montagem do kit de entrega vem no preço (premissa registrada em 06/11). */
export const KIT_FULFILLMENT_SENTENCE: Record<KitFulfillment, string> = {
  DELIVERY_SETUP: 'A equipe da X Produções leva o kit ao local do evento, monta e busca depois.',
  CLIENT_PICKUP: 'Você retira o kit na X Produções, em Belo Horizonte, monta no local e devolve depois do evento.',
};

export interface KitInfoLike {
  minimumRentalDuration?: number | string | null;
  extraHourPrice?: number | string | null;
  fulfillment?: string | null;
}

/** O tipo do kit. Sem o campo (resposta antiga, carrinho salvo antes), o padrão do banco: entrega e montagem. */
export function kitFulfillment(kit: KitInfoLike): KitFulfillment {
  return kit.fulfillment === 'CLIENT_PICKUP' ? 'CLIENT_PICKUP' : 'DELIVERY_SETUP';
}

/** Horas incluídas no preço e valor da hora extra, só quando a conta do servidor os usa. */
export function kitHours(kit: KitInfoLike): { included: number | null; extraHourPrice: number | null } {
  const value = Number(kit.minimumRentalDuration ?? 0);
  const included = Number.isInteger(value) && value > 0 ? value : null;
  const extra = toNumber(kit.extraHourPrice);
  return { included, extraHourPrice: included && extra > 0 ? extra : null };
}

/** "4 h incluídas · Retirada pelo cliente": o resumo do cartão do kit e do carrinho. */
export function kitCompactInfo(kit: KitInfoLike): string {
  const { included } = kitHours(kit);
  return [included ? `${included} h incluídas` : null, KIT_FULFILLMENT_SHORT[kitFulfillment(kit)]].filter(Boolean).join(' · ');
}
