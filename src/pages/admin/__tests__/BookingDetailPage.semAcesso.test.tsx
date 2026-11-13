import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { bookingAPI, addNotification, equipe } = vi.hoisted(() => ({
  bookingAPI: { getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn() },
  addNotification: vi.fn(),
  // Como GET /collaborators chega depois do useCollaborators (nome em name; status do cadastro e a conta em user).
  equipe: [
    { id: 'c1', name: 'Ana Souza', role: 'DJ', status: 'ACTIVE', user: { isActive: true } },
    { id: 'c2', name: 'Gil Rocha', role: 'DJ', status: 'PENDING_APPROVAL', user: { isActive: true } },
    { id: 'c3', name: 'Edu Nunes', role: 'DJ', status: 'INACTIVE', user: { isActive: false } },
    // Conta excluída a pedido da pessoa (LGPD): conta desativada, cadastro ACTIVE.
    { id: 'c4', name: 'Usuário removido', role: 'DJ', status: 'ACTIVE', user: { isActive: false } },
  ],
}));
vi.mock('../../../services/api', () => ({ bookingAPI, api: { post: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('@/hooks/useCollaborators', () => ({ useCollaborators: () => ({ collaborators: equipe, fetchCollaborators: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));
vi.mock('@/components/bookings/BookingCollaborators', () => ({ BookingCollaborators: () => null }));
vi.mock('@/components/bookings/BookingFinancialSummary', () => ({ BookingFinancialSummary: () => null }));
// A janela "Gerenciar Colaboradores" mostra quem recebeu para escalar.
vi.mock('../../../components/modals/EventManagement', () => ({
  EventManagement: ({ collaborators }: { collaborators: Array<{ name: string }> }) => (
    <ul aria-label="Pode escalar">{collaborators.map((c) => <li key={c.name}>{c.name}</li>)}</ul>
  ),
}));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import BookingDetailPage from '../BookingDetailPage';

// Decisão de Alyson (12/11/2026): quem está com o acesso desativado (cadastro "Inativo" ou conta desativada) não
// aparece para escalar em "Confirmar reserva" nem em "Alocar equipe e confirmar"; o servidor também recusa.
const reservaPendente = {
  id: 'XP-ANA-20270110', status: 'PENDING', deliveryStatus: 'PENDING', totalPrice: 900,
  eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T02:00:00.000Z', location: 'Espaço VIP',
  clientId: null, client: null,
  clientName: 'Ana Souza', clientContact: '(31) 98888-7777', clientEmail: 'ana@cliente.test',
  attachments: [], equipments: [], services: [], eventCollaborators: [],
};

async function abrirReserva() {
  bookingAPI.getById.mockResolvedValue({ data: reservaPendente });
  render(
    <MemoryRouter initialEntries={['/admin/reservas/XP']}>
      <Routes><Route path="/admin/reservas/:id" element={<BookingDetailPage />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: /^Reserva / });
}

describe('BookingDetailPage — quem está sem acesso não aparece para escalar (decisão de 12/11/2026)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('"Alocar equipe e confirmar": a janela recebe só quem tem acesso (o cadastro pendente continua)', async () => {
    await abrirReserva();
    fireEvent.click(screen.getByRole('button', { name: 'Alocar equipe e confirmar' }));

    const lista = await screen.findByRole('list', { name: 'Pode escalar' });
    expect(Array.from(lista.querySelectorAll('li')).map((li) => li.textContent)).toEqual(['Ana Souza', 'Gil Rocha']);
  });

  it('"Confirmar reserva": o colaborador responsável sai só de quem tem acesso', async () => {
    await abrirReserva();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));

    const responsavel = (await screen.findByLabelText('Colaborador responsável (opcional)')) as HTMLSelectElement;
    expect(Array.from(responsavel.options).map((o) => o.textContent)).toEqual(['Não atribuir agora', 'Ana Souza', 'Gil Rocha']);
  });
});
