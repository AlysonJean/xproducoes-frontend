import { describe, it, expect } from 'vitest';
import { bookingPricing, formatPricingLineTotal, toArrangeKind, toArrangeKinds, toArrangeNote } from '../bookingPricing';
import {
  PROPOSAL_EXPIRED_LABEL,
  PROPOSAL_SENT_LABEL,
  clientBookingStatusLabel,
  clientProposalValidityText,
  proposalExpiredForClient,
} from '../bookingStatus';
import { formatPrice } from '../formatPrice';

// Auditoria do orçamento (12/11/2026), decisão da dona de 12/11: o link da proposta mostra sempre a reserva atual.
// - O21/D9: "Frete a combinar" e "Pedágio à parte" (R$ 0 por falha ou falta de preço) aparecem como "a combinar"/"à
//   parte", nunca "R$ 0,00", com a frase de que o total não os inclui. O servidor marca (toArrange); aqui o espelho da
//   resposta sem `pricing` e o texto das telas.
// - O11/D6: proposta vencida aparece como vencida para o cliente ("peça uma nova"), com a validade.
const item = (description: string, totalPrice: string, itemType = 'CUSTOM') => ({ description, quantity: 1, unitPrice: totalPrice, discount: '0', totalPrice, itemType });

describe('O21/D9 — linha sem preço: "a combinar" e "à parte"', () => {
  it('a marca é a mesma do servidor: item personalizado, valor zero e a descrição gravada', () => {
    expect(toArrangeKind(item('Frete a combinar', '0'))).toBe('freight');
    expect(toArrangeKind(item('Pedágio à parte', '0.00'))).toBe('toll');
    expect(toArrangeKind(item('Frete a combinar', '180.00'))).toBeNull();
    expect(toArrangeKind(item('Frete (5 km por trecho; até 15 km incluso no kit)', '0'))).toBeNull();
    expect(toArrangeKind(item('Frete (5 km por trecho, dentro dos 15 km sem cobrança)', '0'))).toBeNull();
    expect(toArrangeKind(item('Frete a combinar', '0', 'SERVICE'))).toBeNull();
  });

  it('o resumo sem `pricing` da API marca a linha; com `pricing`, vale a marca do servidor', () => {
    const fallback = bookingPricing({ totalPrice: '900', items: [item('Kit', '900', 'KIT'), item('Frete a combinar', '0'), item('Pedágio à parte', '0')] });
    expect(fallback.lines.map((line) => line.toArrange ?? null)).toEqual([null, 'freight', 'toll']);
    expect(fallback.lines[0]).not.toHaveProperty('toArrange');

    const fromApi = bookingPricing({
      pricing: {
        lines: [{ description: 'Frete a combinar', quantity: 1, unitPrice: 0, discount: 0, total: 0, type: 'CUSTOM', equipmentId: null, serviceId: null, kitId: null, toArrange: 'freight' }],
        itemsSubtotal: 0, couponDiscount: null, adjustment: 0, total: 900,
      },
    });
    expect(fromApi.lines[0].toArrange).toBe('freight');
  });

  it('o valor da linha: "a combinar"/"à parte" na sem preço, o preço nas outras (inclusive o R$ 0 incluso no kit)', () => {
    expect(formatPricingLineTotal({ total: 0, toArrange: 'freight' })).toBe('a combinar');
    expect(formatPricingLineTotal({ total: 0, toArrange: 'toll' })).toBe('à parte');
    expect(formatPricingLineTotal({ total: 650 })).toBe(formatPrice(650));
    expect(formatPricingLineTotal({ total: 0 })).toBe(formatPrice(0));
  });

  it('a frase do total diz o que ficou de fora (a mesma do e-mail da proposta)', () => {
    expect(toArrangeKinds([{ toArrange: 'toll' }, {}, { toArrange: 'freight' }, { toArrange: 'toll' }])).toEqual(['freight', 'toll']);
    expect(toArrangeNote([{ toArrange: 'freight' }, { toArrange: 'toll' }])).toBe('O frete (a combinar) e o pedágio (à parte) não estão no total.');
    expect(toArrangeNote([{ toArrange: 'freight' }])).toBe('O frete ainda vai ser combinado com a equipe e não está no total.');
    expect(toArrangeNote([{ toArrange: 'toll' }])).toBe('O pedágio é cobrado à parte e não está no total.');
    expect(toArrangeNote([{}])).toBeNull();
  });
});

describe('O11/D6 — proposta vencida na área do cliente', () => {
  const SENT_AT = '2027-12-08T13:30:00.000Z';
  const VALE_ATE = '2027-12-15T02:59:59.999Z'; // 14/12/2027, 23:59:59 em Brasília
  const ANTES = Date.parse('2027-12-14T12:00:00-03:00');
  const DEPOIS = Date.parse('2027-12-15T00:00:01-03:00');

  it('vencida pelo servidor (expired) ou pela validade já passada: "Proposta vencida — peça uma nova"', () => {
    expect(PROPOSAL_EXPIRED_LABEL).toBe('Proposta vencida — peça uma nova');
    expect(clientBookingStatusLabel({ status: 'PENDING', proposal: { sentAt: SENT_AT, validUntil: VALE_ATE, expired: true } })).toBe(PROPOSAL_EXPIRED_LABEL);
    expect(proposalExpiredForClient({ status: 'PENDING', proposal: { sentAt: SENT_AT, validUntil: VALE_ATE, expired: false } }, DEPOIS)).toBe(true);
    expect(proposalExpiredForClient({ status: 'PENDING', proposal: { sentAt: SENT_AT, validUntil: VALE_ATE, expired: false } }, ANTES)).toBe(false);
  });

  it('ainda valendo, resposta antiga sem validade ou reserva já confirmada: os rótulos de antes', () => {
    expect(clientBookingStatusLabel({ status: 'PENDING', proposal: { sentAt: SENT_AT, validUntil: '2999-01-01T02:59:59.999Z', expired: false } })).toBe(PROPOSAL_SENT_LABEL);
    expect(clientBookingStatusLabel({ status: 'PENDING', proposal: { sentAt: SENT_AT } })).toBe(PROPOSAL_SENT_LABEL);
    expect(clientBookingStatusLabel({ status: 'CONFIRMED', proposal: { sentAt: SENT_AT, validUntil: VALE_ATE, expired: true } })).toBe('Confirmada');
    expect(clientBookingStatusLabel({ status: 'PENDING', proposal: { sentAt: null } })).toBe('Pendente');
  });

  it('a validade para o cliente: "válida até" ou "acabou em ... peça uma nova", em Brasília', () => {
    const enviada = { status: 'PENDING', proposal: { sentAt: SENT_AT, validUntil: VALE_ATE, expired: false } };
    expect(clientProposalValidityText(enviada, ANTES)).toBe('Proposta válida até 14/12/2027.');
    expect(clientProposalValidityText(enviada, DEPOIS)).toBe('A validade da proposta acabou em 14/12/2027. Fale com a equipe para receber uma nova.');
    expect(clientProposalValidityText({ status: 'PENDING', proposal: { sentAt: SENT_AT } }, ANTES)).toBeNull();
    expect(clientProposalValidityText({ status: 'CONFIRMED', proposal: { sentAt: SENT_AT, validUntil: VALE_ATE } }, DEPOIS)).toBeNull();
  });
});
