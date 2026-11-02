import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'CLIENT' } }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../components/client/BookingChatPanel', () => ({ BookingChatPanel: () => null }));
vi.mock('../../../utils/generateBookingProposalPdf', () => ({ generateBookingProposalPdf: vi.fn() }));

import { BookingDetailsPage } from '../BookingDetailsPage';

// Escala ainda com o cachê, como a API mandava antes da correção: mesmo que o valor chegue, a
// tela do cliente não pode mostrá-lo.
const BOOKING = {
  id: 'XP-1',
  status: 'CONFIRMED',
  eventDate: '2026-12-10T22:00:00.000Z',
  totalPrice: '1200',
  attachments: [],
  eventCollaborators: [
    { id: 'ec-1', role: 'DJ', totalHours: null, totalPayment: '500', collaborator: { name: 'Bruno Lima' } },
  ],
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/cliente/reservas/XP-1']}>
      <Routes>
        <Route path="/cliente/reservas/:id" element={<BookingDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );

// Achado (revisão antes do deploy): o card "Equipe do Evento" mostrava ao cliente o cachê de cada
// colaborador (totalPayment, o "custo de equipe" da margem no painel admin) e, sem horas
// lançadas, um "h" solto.
describe('BookingDetailsPage (cliente) — Equipe do Evento', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockResolvedValue(BOOKING);
  });

  it('mostra nome e função da equipe, sem o cachê do colaborador', async () => {
    renderPage();

    expect(await screen.findByText('Equipe do Evento')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/bookings/XP-1');
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
    expect(screen.getByText('DJ')).toBeInTheDocument();
    expect(screen.queryByText(/500,00/)).not.toBeInTheDocument();
    expect(screen.queryByText('h')).not.toBeInTheDocument();
  });
});
