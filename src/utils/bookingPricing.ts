// D8a e P16 (aprovadas em 02/11/2026): um valor final só por reserva, mostrado igual em toda tela.
// Achado: cada tela fazia a sua conta. A página do cliente somava o totalPrice com o "Valor do Serviço"
// (serviceValue) — como texto, porque o valor chega como "1500.00": R$ 15.001.500,00 —, a agenda mostrava
// um ou outro e o PDF do painel recalculava pelo catálogo. O valor final é só o totalPrice, e a conta é
// do servidor (backend/src/services/booking/bookingPricing.ts), que manda o resumo em `pricing` na ficha
// da reserva (GET /bookings/:id). Este arquivo lê esse resumo e, quando a resposta não o traz (versão
// anterior da API durante o deploy), faz a mesma conta, conferida pelo mesmo vetor de casos nos testes
// dos dois lados.

type Money = number | string | null | undefined;

export interface BookingPricingLine {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  type: string;
  equipmentId: string | null;
  serviceId: string | null;
  kitId: string | null;
}

export interface BookingPricing {
  lines: BookingPricingLine[];
  itemsSubtotal: number;
  couponDiscount: { amount: number; code: string | null } | null;
  /** Valor final menos (itens − cupom): "Ajuste no valor final", mostrado só quando há itens e ≠ 0. */
  adjustment: number;
  /** O valor final: o totalPrice gravado. */
  total: number;
}

export interface BookingItemLike {
  description: string;
  quantity?: number | null;
  unitPrice?: Money;
  discount?: Money;
  totalPrice?: Money;
  itemType?: string | null;
  equipmentId?: string | null;
  serviceId?: string | null;
  kitId?: string | null;
}

/** O que qualquer tela tem de uma reserva: o bastante para achar o valor final e as linhas. */
export interface PricedBookingLike {
  totalPrice?: Money;
  discountAmount?: Money;
  coupon?: { code?: string | null } | null;
  items?: BookingItemLike[] | null;
  pricing?: BookingPricing | null;
}

// Rótulo do tipo de linha nos PDFs.
export const PRICING_LINE_TYPE_LABEL: Record<string, string> = {
  KIT: 'Kit',
  EQUIPMENT: 'Equipamento',
  SERVICE: 'Serviço',
  CUSTOM: 'Adicional',
};

const toCents = (value: Money): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
const fromCents = (cents: number): number => cents / 100;

const HOUR_MS = 60 * 60 * 1000;

/** Horas do evento pelo início e término (arredondadas para cima, no mínimo 1); null sem as duas datas. */
export function hoursBetween(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(ms) && ms > 0 ? Math.max(1, Math.ceil(ms / HOUR_MS)) : null;
}

export type EquipmentPriceUnit = 'hour' | 'day';

/*
 * Decisões do dono de 06/11, as mesmas do servidor (backend/src/services/booking/bookingPricing.ts). Kit:
 * preço por evento, nunca vezes as horas. Equipamento avulso: por hora ou por diária, conforme a chave
 * EQUIPMENT_PRICE_UNIT do servidor, que o site lê em GET /equipments/pricing-rules (hooks/usePricingRules).
 * Diária: 24 h arredondadas para cima, no mínimo 1 e no mínimo o minimumRentalDuration do equipamento.
 */
const DAY_MS = 24 * HOUR_MS;

/** Unidades cobradas de um equipamento pelas datas; null sem as duas datas (ou com término antes do início). */
export function equipmentUnits(unit: EquipmentPriceUnit, start?: string | null, end?: string | null, minimumDays?: number | null): number | null {
  if (unit === 'hour') return hoursBetween(start, end);
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return Math.max(1, Math.ceil(ms / DAY_MS), minimumDays ?? 1);
}

/** "5 h" ou "2 diárias", como na descrição das linhas do servidor. */
export function equipmentUnitText(n: number, unit: EquipmentPriceUnit): string {
  return unit === 'hour' ? `${n} h` : `${n} ${n === 1 ? 'diária' : 'diárias'}`;
}

/** Sufixo do preço de catálogo do equipamento: "/h" ou "/diária". */
export function equipmentUnitSuffix(unit: EquipmentPriceUnit): string {
  return unit === 'hour' ? '/h' : '/diária';
}

/** A unidade que o servidor pôs no equipamento (priceUnit das respostas públicas); null quando não veio. */
export function priceUnitOf(item: unknown): EquipmentPriceUnit | null {
  const unit = (item as { priceUnit?: unknown } | null | undefined)?.priceUnit;
  return unit === 'hour' || unit === 'day' ? unit : null;
}

/**
 * Unidades pelo tempo de operação em horas (o orçamento do site pede a duração, não o término): a mesma conta
 * de equipmentUnits, com o término `hours` horas depois do início. null sem duração positiva.
 */
export function equipmentUnitsForHours(unit: EquipmentPriceUnit, hours: number, minimumDays?: number | null): number | null {
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return equipmentUnits(unit, new Date(0).toISOString(), new Date(hours * HOUR_MS).toISOString(), minimumDays);
}

// Lote 13, campos do kit (aprovados pelo dono em 06/11/2026): a mesma linha do kit do servidor (kitPriceLine
// em backend/src/services/booking/bookingPricing.ts), conferida pelo mesmo vetor de casos nos dois lados.
export type KitFulfillment = 'DELIVERY_SETUP' | 'CLIENT_PICKUP';

/** "R$ 1.234,56", como o servidor escreve na descrição da linha (sem o Intl, que põe espaço não separável). */
export function formatBRL(cents: number): string {
  const [int, dec] = (Math.abs(cents) / 100).toFixed(2).split('.');
  return `${cents < 0 ? '-' : ''}R$ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
}

/** O que a conta do kit lê do cadastro. */
export interface KitPricingInput {
  name?: string | null;
  price?: Money;
  /** Horas incluídas no preço (Kit.minimumRentalDuration). */
  minimumRentalDuration?: number | null;
  /** Valor da hora extra; vazio ou zero = sem cobrança de hora extra. */
  extraHourPrice?: Money;
  fulfillment?: string | null;
}

/**
 * Linha do kit: preço do evento; com horas incluídas e valor de hora extra (os dois maiores que zero), cada
 * hora cheia do evento além das incluídas soma uma hora extra, em centavos. Uma linha só, com as horas e a
 * retirada na descrição. `hours` nulo (sem as datas) não conta hora extra.
 */
export function kitPriceLine(kit: KitPricingInput, hours: number | null): { description: string; cents: number; extraHours: number } {
  const includedValue = Number(kit.minimumRentalDuration ?? 0);
  const included = Number.isInteger(includedValue) && includedValue > 0 ? includedValue : 0;
  const extraHourCents = Math.max(0, toCents(kit.extraHourPrice));
  const extraHours = included > 0 && extraHourCents > 0 && hours !== null && hours > included ? hours - included : 0;
  const notes: string[] = [];
  if (included > 0) {
    notes.push(
      extraHours > 0
        ? `${included} h incluídas + ${extraHours} ${extraHours === 1 ? 'hora extra' : 'horas extras'} de ${formatBRL(extraHourCents)}`
        : `${included} h incluídas`
    );
  }
  if (kit.fulfillment === 'CLIENT_PICKUP') notes.push('retirada e montagem pelo cliente');
  const name = kit.name || 'Kit';
  return {
    description: notes.length > 0 ? `${name} (${notes.join('; ')})` : name,
    cents: toCents(kit.price) + extraHours * extraHourCents,
    extraHours,
  };
}

/** O resumo de preço da reserva: o da API (`pricing`) quando veio; sem ele, a mesma conta do servidor. */
export function bookingPricing(b: PricedBookingLike): BookingPricing {
  if (b.pricing && typeof b.pricing.total === 'number' && Array.isArray(b.pricing.lines)) return b.pricing;
  const lines: BookingPricingLine[] = (b.items ?? []).map((item) => ({
    description: item.description,
    quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
    unitPrice: fromCents(toCents(item.unitPrice)),
    discount: fromCents(toCents(item.discount)),
    total: fromCents(Math.max(0, toCents(item.totalPrice))),
    type: item.itemType || 'CUSTOM',
    equipmentId: item.equipmentId ?? null,
    serviceId: item.serviceId ?? null,
    kitId: item.kitId ?? null,
  }));
  const subtotalCents = lines.reduce((sum, l) => sum + toCents(l.total), 0);
  const couponCents = Math.max(0, toCents(b.discountAmount));
  const totalCents = Math.max(0, toCents(b.totalPrice));
  return {
    lines,
    itemsSubtotal: fromCents(subtotalCents),
    couponDiscount: couponCents > 0 ? { amount: fromCents(couponCents), code: b.coupon?.code ?? null } : null,
    adjustment: lines.length > 0 ? fromCents(totalCents - (subtotalCents - couponCents)) : 0,
    total: fromCents(totalCents),
  };
}
