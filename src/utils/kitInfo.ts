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

/**
 * A frase de cada tipo de kit. A montagem do kit de entrega vem no preço (premissa registrada em 06/11). Auditoria do
 * orçamento (12/11/2026), E4: a da entrega diz o frete da decisão de 12/11 (a Logística do kit cobre até 15 km da
 * sede; acima disso, só os km a mais); a de retirada não tem entrega nem frete. A página do kit usa kitPageSentence
 * (abaixo), que completa a da entrega com o técnico; a política de reserva cita a primeira frase da entrega
 * (ReservationPolicyPage.p17).
 */
export const KIT_DELIVERY_FREIGHT_SENTENCE = 'O frete até 15 km da X Produções já vem no kit; acima disso, só os km a mais entram como frete.';
export const KIT_FULFILLMENT_SENTENCE: Record<KitFulfillment, string> = {
  DELIVERY_SETUP: `A equipe da X Produções leva o kit ao local do evento, monta e busca depois. ${KIT_DELIVERY_FREIGHT_SENTENCE}`,
  CLIENT_PICKUP: 'Você retira o kit na X Produções, em Belo Horizonte, monta no local e devolve depois do evento.',
};

// Lote 13 (decisão do dono de 06/11/2026): a outra opção da entrega, a caixa "Quero um técnico durante todo o evento".
export const KIT_TECHNICIAN_OPTIONAL_SENTENCE = 'Se preferir, um técnico fica durante todo o evento, cobrado à parte.';
// Auditoria do orçamento (12/11/2026), E1: o kit que já traz o técnico (Kits 05–08) nunca oferece técnico à parte.
export const KIT_TECHNICIAN_INCLUDED_SENTENCE = 'O técnico que acompanha todo o evento já vem incluso neste kit.';

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

/** O que a frase da página lê da composição do kit: os itens, com o serviço de cada um (null no equipamento). */
export interface KitCompositionLike {
  items?: ReadonlyArray<{ service?: { coversWholeEvent?: boolean | null } | null } | null> | null;
}

/**
 * Auditoria do orçamento (12/11/2026), E1: o kit já traz o técnico do evento todo quando um item dele é um serviço
 * marcado "Pode acompanhar o evento todo" (coversWholeEvent, o Técnico de Som). Pela composição, nunca pelo nome.
 */
export function kitIncludesWholeEventTechnician(kit: KitCompositionLike): boolean {
  return (kit.items ?? []).some((item) => item?.service?.coversWholeEvent === true);
}

/**
 * A frase da página do kit. Retirada: a de sempre, sem entrega e sem frete. Entrega: leva, monta e busca, com o frete;
 * e o técnico incluso (kit com o técnico na composição) ou cobrado à parte.
 */
export function kitPageSentence(kit: KitInfoLike & KitCompositionLike): string {
  const fulfillment = kitFulfillment(kit);
  if (fulfillment === 'CLIENT_PICKUP') return KIT_FULFILLMENT_SENTENCE.CLIENT_PICKUP;
  const technician = kitIncludesWholeEventTechnician(kit) ? KIT_TECHNICIAN_INCLUDED_SENTENCE : KIT_TECHNICIAN_OPTIONAL_SENTENCE;
  return `${KIT_FULFILLMENT_SENTENCE[fulfillment]} ${technician}`;
}
