import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// D11 (aprovada em 02/11/2026): "o cliente vê 'Proposta enviada, aguardando sua resposta'". A API manda
// proposal.sentAt nas reservas do cliente; a reserva pendente com a proposta enviada ganha esse rótulo em Minhas
// Reservas, no painel, na agenda e na página da reserva. Antes: só "Pendente". E a lista quebrava com uma reserva
// reembolsada (o selo não tinha REFUNDED).
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'CLIENT' } }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../components/client/BookingChatPanel', () => ({ BookingChatPanel: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { BookingListItem } from '../../../components/ui/BookingListItem';
import { BookingDetailsModal } from '../ClientCalendarPage';
import { BookingDetailsPage } from '../BookingDetailsPage';
import { PROPOSAL_SENT_LABEL, clientBookingStatusLabel } from '../../../utils/bookingStatus';
import type { SafeBooking } from '../../../types/types';

const SENT_AT = '2027-12-08T13:30:00.000Z';
const reserva = (over: Partial<SafeBooking> = {}): SafeBooking => ({
  id: 'XP-ANA-1', eventDate: '2027-12-21T01:00:00.000Z', eventTitle: 'Formatura', status: 'PENDING' as SafeBooking['status'],
  totalPrice: 900, equipments: [], ...over,
});

beforeEach(() => apiFetch.mockReset());

describe('D11 — "Proposta enviada — aguardando sua resposta" na área do cliente', () => {
  it('clientBookingStatusLabel: só a reserva pendente com a proposta enviada muda de rótulo', () => {
    expect(PROPOSAL_SENT_LABEL).toBe('Proposta enviada — aguardando sua resposta');
    expect(clientBookingStatusLabel({ status: 'PENDING', proposal: { sentAt: SENT_AT } })).toBe(PROPOSAL_SENT_LABEL);
    expect(clientBookingStatusLabel({ status: 'PENDING', proposal: { sentAt: null } })).toBe('Pendente');
    expect(clientBookingStatusLabel({ status: 'PENDING' })).toBe('Pendente');
    expect(clientBookingStatusLabel({ status: 'CONFIRMED', proposal: { sentAt: SENT_AT } })).toBe('Confirmada');
    expect(clientBookingStatusLabel({ status: 'CANCELLED', proposal: { sentAt: SENT_AT } })).toBe('Cancelada');
  });

  it('Minhas Reservas e painel (BookingListItem): o rótulo, o "Em preparação" sem valor, e a reembolsada não quebra', () => {
    render(
      <>
        <BookingListItem booking={reserva({ id: 'XP-ENVIADA', proposal: { sentAt: SENT_AT } })} />
        <BookingListItem booking={reserva({ id: 'XP-SEM-ENVIO', totalPrice: 0 })} />
        <BookingListItem booking={reserva({ id: 'XP-REEMBOLSADA', status: 'REFUNDED' as SafeBooking['status'] })} />
      </>,
    );

    expect(screen.getByText(PROPOSAL_SENT_LABEL)).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('Em preparação')).toBeInTheDocument();
    expect(screen.getByText('Reembolsada')).toBeInTheDocument();
  });

  it('agenda do cliente: a janela da reserva mostra o rótulo', () => {
    const inicio = new Date('2027-12-21T01:00:00.000Z');
    render(
      <MemoryRouter>
        <BookingDetailsModal
          event={{ title: 'Evento', start: inicio, end: inicio, resource: reserva({ proposal: { sentAt: SENT_AT } }) } as never}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(PROPOSAL_SENT_LABEL)).toBeInTheDocument();
  });

  it('página da reserva: o selo de status mostra o rótulo', async () => {
    apiFetch.mockResolvedValue({
      id: 'XP-ANA-1', status: 'PENDING', eventDate: '2027-12-21T01:00:00.000Z', totalPrice: '900',
      attachments: [], eventCollaborators: [], proposal: { sentAt: SENT_AT },
    });
    render(
      <MemoryRouter initialEntries={['/cliente/reservas/XP-ANA-1']}>
        <Routes>
          <Route path="/cliente/reservas/:id" element={<BookingDetailsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(PROPOSAL_SENT_LABEL)).toBeInTheDocument();
  });
});
