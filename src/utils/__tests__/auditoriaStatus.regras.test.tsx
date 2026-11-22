import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { bookingAPI } = vi.hoisted(() => ({ bookingAPI: { getAuditHistory: vi.fn() } }));
vi.mock('@/services/api', () => ({ bookingAPI }));

import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_TRANSITIONS,
  CONTRACT_ACCEPTED_LABEL,
  CONTRACT_PAID_LABEL,
  NEW_BOOKING_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  deliveryOptionsFor,
  paymentOptionsFor,
  bookingStatusOptionsFrom,
  clientBookingStatusLabel,
  clientProposalValidityText,
  proposalExpiredForClient,
} from '../bookingStatus';
import { ProposalHistory } from '../../components/bookings/ProposalHistory';

// Auditoria do status da reserva (21/11/2026): as regras do site.

describe('C4: depois do aceite do contrato, a área do cliente não diz "Proposta vencida"', () => {
  const NOW = Date.parse('2026-11-21T15:00:00.000Z');
  const vencida = { sentAt: '2026-11-10T12:00:00.000Z', validUntil: '2026-11-18T02:59:59.999Z', expired: false };

  it('aceita (contractAcceptedAt): rótulo "Contrato aceito — aguardando o sinal", nunca vencida, sem o texto da validade', () => {
    const booking = { status: 'PENDING', proposal: { ...vencida, contractAcceptedAt: '2026-11-17T20:00:00.000Z' } };

    expect(clientBookingStatusLabel(booking)).toBe(CONTRACT_ACCEPTED_LABEL);
    expect(CONTRACT_ACCEPTED_LABEL).toBe('Contrato aceito — aguardando o sinal');
    expect(proposalExpiredForClient(booking, NOW)).toBe(false);
    expect(clientProposalValidityText(booking, NOW)).toBeNull();
  });

  it('sem aceite, a proposta vencida continua vencida (o que já valia)', () => {
    const booking = { status: 'PENDING', proposal: vencida };

    expect(clientBookingStatusLabel(booking)).toBe('Proposta vencida — peça uma nova');
    expect(proposalExpiredForClient(booking, NOW)).toBe(true);
    expect(clientProposalValidityText(booking, NOW)).toBe('A validade da proposta acabou em 17/11/2026. Fale com a equipe para receber uma nova.');
  });

  it('aceita com o sinal já registrado (parcial ou pago): "Contrato aceito — sinal recebido"', () => {
    const proposal = { ...vencida, contractAcceptedAt: '2026-11-17T20:00:00.000Z' };
    expect(clientBookingStatusLabel({ status: 'PENDING', paymentStatus: 'PARTIAL', proposal })).toBe(CONTRACT_PAID_LABEL);
    expect(clientBookingStatusLabel({ status: 'PENDING', paymentStatus: 'PAID', proposal })).toBe('Contrato aceito — sinal recebido');
    expect(clientBookingStatusLabel({ status: 'PENDING', paymentStatus: 'PENDING', proposal })).toBe(CONTRACT_ACCEPTED_LABEL);
  });

  it('confirmada (o sinal entrou): o rótulo é o do status', () => {
    expect(clientBookingStatusLabel({ status: 'CONFIRMED', proposal: { ...vencida, contractAcceptedAt: '2026-11-17T20:00:00.000Z' } })).toBe('Confirmada');
  });
});

describe('C3: as trocas que o seletor oferece', () => {
  it('a tabela do site é a do servidor (bookingTransitions.ts)', () => {
    expect(BOOKING_STATUS_TRANSITIONS).toEqual({
      DRAFT: ['PENDING', 'CONFIRMED', 'CANCELLED'],
      PENDING: ['DRAFT', 'CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      IN_PROGRESS: ['CONFIRMED', 'COMPLETED', 'CANCELLED'],
      COMPLETED: ['CONFIRMED', 'IN_PROGRESS'],
      CANCELLED: ['PENDING', 'REFUNDED'],
      REFUNDED: ['CANCELLED'],
    });
    expect(Object.keys(BOOKING_STATUS_TRANSITIONS).sort()).toEqual(Object.keys(BOOKING_STATUS_LABELS).sort());
  });

  it('o seletor traz o status atual e as trocas, na ordem de sempre; status desconhecido mostra todos', () => {
    expect(bookingStatusOptionsFrom('CANCELLED')).toEqual([
      { value: 'PENDING', label: 'Pendente' },
      { value: 'CANCELLED', label: 'Cancelada' },
      { value: 'REFUNDED', label: 'Reembolsada' },
    ]);
    expect(bookingStatusOptionsFrom('QUALQUER')).toHaveLength(7);
    expect(bookingStatusOptionsFrom(null)).toHaveLength(7);
  });

  it('B1: a entrega da reserva cancelada só volta ao início ou registra o recolhimento (e mantém a atual)', () => {
    expect(deliveryOptionsFor('CANCELLED', 'PENDING').map((option) => option.value)).toEqual(['PENDING', 'PICKUP_PENDING', 'COMPLETED']);
    expect(deliveryOptionsFor('REFUNDED', 'ARRIVED').map((option) => option.value)).toEqual(['PENDING', 'ARRIVED', 'PICKUP_PENDING', 'COMPLETED']);
    expect(deliveryOptionsFor('CONFIRMED', 'PENDING')).toHaveLength(7);
  });

  it('B2: reserva nova só entra como Rascunho, Pendente ou Confirmada', () => {
    expect(NEW_BOOKING_STATUS_OPTIONS.map((option) => option.value)).toEqual(['DRAFT', 'PENDING', 'CONFIRMED']);
  });
});

describe('C7: o cartão Histórico mostra as trocas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('status, pagamento, entrega e valor, de → para e por quem; o cancelamento pelo cliente diz isso', async () => {
    bookingAPI.getAuditHistory.mockResolvedValue({
      data: [
        { action: 'STATUS_CHANGED', timestamp: '2026-11-21T15:00:00.000Z', actorName: 'Ana Cliente', details: { from: 'PENDING', to: 'CANCELLED', channel: 'cliente' } },
        { action: 'PRICE_CHANGED', timestamp: '2026-11-20T15:00:00.000Z', actorName: 'Dono', details: { from: 900, to: 1100 } },
        { action: 'DELIVERY_STATUS_CHANGED', timestamp: '2026-11-19T15:00:00.000Z', actorName: 'Dono', details: { from: 'PENDING', to: 'ON_THE_WAY' } },
        { action: 'PAYMENT_STATUS_CHANGED', timestamp: '2026-11-18T15:00:00.000Z', actorName: 'Dono', details: { from: null, to: 'PARTIAL' } },
        { action: 'STATUS_CHANGED', timestamp: '2026-11-17T15:00:00.000Z', actorName: 'Dono', details: { from: 'DRAFT', to: 'CONFIRMED' } },
      ],
    });
    render(<ul><ProposalHistory bookingId="XP-1" refreshKey={0} /></ul>);

    expect(await screen.findByText('Status: Pendente → Cancelada (pelo cliente)')).toBeInTheDocument();
    expect(screen.getByText('Valor: R$ 900,00 → R$ 1.100,00')).toBeInTheDocument();
    expect(screen.getByText('Entrega: Pendente → A caminho')).toBeInTheDocument();
    expect(screen.getByText('Pagamento: Não informado → Parcial')).toBeInTheDocument();
    expect(screen.getByText('Status: Rascunho → Confirmada')).toBeInTheDocument();
    expect(screen.getByText(/por Ana Cliente/)).toBeInTheDocument();
  });
});

describe('onda 2b da auditoria do status (D8): o pagamento "Devolvido"', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não se escolhe à mão; com ele, o seletor só tem ele', () => {
    expect(PAYMENT_STATUS_OPTIONS.map((o) => o.value)).toEqual(['', 'PENDING', 'PARTIAL', 'PAID']);
    expect(paymentOptionsFor('PAID')).toBe(PAYMENT_STATUS_OPTIONS);
    expect(paymentOptionsFor(null)).toBe(PAYMENT_STATUS_OPTIONS);
    expect(paymentOptionsFor('REFUNDED')).toEqual([{ value: 'REFUNDED', label: 'Devolvido' }]);
  });

  it('o histórico mostra o reembolso registrado (valor e dia) e a troca do pagamento para Devolvido', async () => {
    bookingAPI.getAuditHistory.mockResolvedValue({
      data: [
        { action: 'REFUND_RECORDED', timestamp: '2026-11-22T15:00:00.000Z', actorName: 'Dono', details: { from: null, to: 450.5, date: '2026-11-20' } },
        { action: 'PAYMENT_STATUS_CHANGED', timestamp: '2026-11-22T15:00:00.000Z', actorName: 'Dono', details: { from: 'PAID', to: 'REFUNDED' } },
      ],
    });
    render(<ul><ProposalHistory bookingId="XP-1" refreshKey={0} /></ul>);

    expect(await screen.findByText('Reembolso registrado: R$ 450,50 devolvidos em 20/11/2026')).toBeInTheDocument();
    expect(screen.getByText('Pagamento: Pago → Devolvido')).toBeInTheDocument();
  });
});
