import { formatPrice } from './formatPrice';
import { serviceLine, serviceMinutesText, type ServicePricingInput } from './bookingPricing';

// Lote 13, técnico durante o evento (decisão do dono de 06/11/2026): numa entrega há duas opções, "a equipe monta e
// busca depois" ou "um técnico responsável durante todo o evento". O serviço que o dono marca no cadastro ("Pode
// acompanhar o evento todo") é o oferecido na caixa do pedido do site e no botão Técnico da Proposta Rápida, e cobra
// pelas horas do evento (serviceLine, a mesma conta do servidor).

/** Serviço oferecido na caixa do técnico: marcado e ativo (o servidor só aceita serviço ativo no pedido do cliente). */
export function isWholeEventService(service: { coversWholeEvent?: boolean | null; status?: string | null }): boolean {
  return service.coversWholeEvent === true && (service.status ?? 'ACTIVE') === 'ACTIVE';
}

/**
 * A regra em palavras, para a caixa do pedido: "R$ 300,00 até 3 h de evento; cada hora a mais sai proporcional." e,
 * quando a duração do evento passa das horas cadastradas, "No seu evento de 6 h: R$ 600,00.".
 */
export function wholeEventRuleText(service: ServicePricingInput, hours: number | null): string {
  const minutes = Number(service.duration ?? 0);
  const price = formatPrice(service.price);
  if (!Number.isInteger(minutes) || minutes <= 0) return `${price}.`;
  const rule = `${price} até ${serviceMinutesText(minutes)} de evento; cada hora a mais sai proporcional.`;
  if (hours === null || hours * 60 <= minutes) return rule;
  return `${rule} No seu evento de ${hours} h: ${formatPrice(serviceLine(service, hours).cents / 100)}.`;
}
