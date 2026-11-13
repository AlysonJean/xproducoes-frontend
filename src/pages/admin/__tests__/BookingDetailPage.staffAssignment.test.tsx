import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { bookingAPI, addNotification, janela } = vi.hoisted(() => ({
  bookingAPI: { getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn() },
  addNotification: vi.fn(),
  // O que a janela "Gerenciar Colaboradores" (EventManagement) devolve ao salvar a equipe.
  janela: { escala: [] as unknown[] },
}));
vi.mock('../../../services/api', () => ({ bookingAPI, api: { post: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('@/hooks/useCollaborators', () => ({ useCollaborators: () => ({ collaborators: [], fetchCollaborators: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));
vi.mock('@/components/bookings/BookingCollaborators', () => ({ BookingCollaborators: () => null }));
vi.mock('@/components/bookings/BookingFinancialSummary', () => ({ BookingFinancialSummary: () => null }));
vi.mock('../../../components/modals/EventManagement', () => ({
  EventManagement: ({ onSave }: { onSave: (assignments: unknown[]) => void }) => (
    <button type="button" onClick={() => onSave(janela.escala)}>Salvar equipe da janela</button>
  ),
}));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import BookingDetailPage from '../BookingDetailPage';

// D3 (aprovada em 02/11/2026): "Alocar equipe e confirmar" mandava role || 'PHOTOGRAPHER' e
// hourlyRate || 0 e, com a reserva sem valor, gravava como preço da reserva a soma dos cachês estimados
// (com o R$ 50 x 4 h que a janela inventava, a reserva saía confirmada por R$ 200). Agora a função e o
// valor vão como vieram da janela, sem valor não vai valor nem total, e o preço da reserva não é tocado.
const reservaSemValor = {
  id: 'XP-ANA-20270110', status: 'PENDING', deliveryStatus: 'PENDING', totalPrice: null,
  eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T02:00:00.000Z', location: 'Espaço VIP',
  clientId: null, client: null,
  clientName: 'Ana Souza', clientContact: '(31) 98888-7777', clientEmail: 'ana@cliente.test',
  attachments: [], equipments: [], services: [], eventCollaborators: [],
};

async function salvarEquipe(reserva: object) {
  bookingAPI.getById.mockResolvedValue({ data: reserva });
  render(
    <MemoryRouter initialEntries={['/admin/reservas/XP']}>
      <Routes><Route path="/admin/reservas/:id" element={<BookingDetailPage />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: /^Reserva / });
  fireEvent.click(screen.getByRole('button', { name: 'Alocar equipe e confirmar' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Salvar equipe da janela' }));
  await waitFor(() => expect(bookingAPI.confirmWithDetails).toHaveBeenCalledTimes(1));
  return bookingAPI.confirmWithDetails.mock.calls[0];
}

describe('BookingDetailPage — "Alocar equipe e confirmar" não inventa valores (D3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingAPI.confirmWithDetails.mockResolvedValue({});
  });

  it('reserva sem valor: a equipe vai como veio da janela e o custo dela não vira o preço da reserva', async () => {
    janela.escala = [
      { id: 'assignment-c1', collaboratorId: 'c1', role: 'SOUND_TECHNICIAN', estimatedHours: 4, hourlyRate: null },
      { id: 'assignment-c2', collaboratorId: 'c2', role: 'DJ', estimatedHours: 5, hourlyRate: 60 },
    ];

    const [id, corpo] = await salvarEquipe(reservaSemValor);

    expect(id).toBe('XP-ANA-20270110');
    expect(corpo).toEqual({
      collaborators: [
        { collaboratorId: 'c1', role: 'SOUND_TECHNICIAN', totalHours: 4 },
        { collaboratorId: 'c2', role: 'DJ', totalHours: 5, hourlyRate: 60, totalPayment: 300 },
      ],
    });
  });

  it('reserva com preço: o preço não vai junto, e função vazia não vira "Fotógrafo"', async () => {
    janela.escala = [{ id: 'assignment-c3', collaboratorId: 'c3', role: '', estimatedHours: 4, hourlyRate: null }];

    const [, corpo] = await salvarEquipe({ ...reservaSemValor, totalPrice: '1500' });

    expect(corpo).toEqual({ collaborators: [{ collaboratorId: 'c3', role: '', totalHours: 4 }] });
  });
});
