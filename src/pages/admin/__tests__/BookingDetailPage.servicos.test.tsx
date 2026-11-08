import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { bookingAPI } = vi.hoisted(() => ({
  bookingAPI: { getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn() },
}));
vi.mock('../../../services/api', () => ({ bookingAPI, api: { post: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('@/hooks/useCollaborators', () => ({ useCollaborators: () => ({ collaborators: [], fetchCollaborators: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));
vi.mock('@/components/bookings/BookingCollaborators', () => ({ BookingCollaborators: () => null }));
vi.mock('@/components/bookings/BookingFinancialSummary', () => ({ BookingFinancialSummary: () => null }));
vi.mock('../../../components/modals/EventManagement', () => ({ EventManagement: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import BookingDetailPage from '../BookingDetailPage';

const TECNICO = 'Técnico de Som e Operação Profissional';

// Pedido do site com o técnico marcado: o serviço vem ligado à reserva (services) e também nos itens.
const RESERVA = {
  id: 'XP-ALYSO-20261107-1807-E4R', status: 'PENDING', deliveryStatus: 'PENDING', totalPrice: '679.99',
  eventDate: '2026-12-12T22:00:00.000Z', eventEndDate: '2026-12-13T04:00:00.000Z', location: 'Betim',
  clientId: null, client: null, clientName: 'Teste', clientContact: '31988887777', clientEmail: null,
  attachments: [], equipments: [], eventCollaborators: [],
  kit: { id: 'kit1', name: 'Combo Festa Prática Bluetooth', price: 79.99, items: [] },
  services: [{ id: 'sv1', name: TECNICO, price: 300, duration: 180 }],
  items: [
    { id: 'i1', description: 'Combo Festa Prática Bluetooth', quantity: 1, unitPrice: '79.99', totalPrice: '79.99', itemType: 'KIT', kitId: 'kit1' },
    { id: 'i2', description: `${TECNICO} (6 h de evento: 3 h incluídas + 3 h a mais)`, quantity: 1, unitPrice: '600', totalPrice: '600', itemType: 'SERVICE', serviceId: 'sv1' },
  ],
};

const renderFicha = async (reserva: object) => {
  bookingAPI.getById.mockResolvedValue({ data: reserva });
  render(
    <MemoryRouter initialEntries={['/admin/reservas/XP']}>
      <Routes><Route path="/admin/reservas/:id" element={<BookingDetailPage />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: /^Reserva / });
};

const secaoServicos = () => within(screen.getByRole('heading', { name: 'Serviços', level: 4 }).parentElement!);

// Conferência de 07/11/2026: com o técnico no pedido, a seção "Serviços" da ficha dizia "Nenhum serviço nesta
// reserva". Os serviços ligados à reserva chegam sem itemType, e a conta os ignorava.
describe('BookingDetailPage — seção Serviços', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra o serviço ligado à reserva (o técnico do pedido)', async () => {
    await renderFicha(RESERVA);
    expect(secaoServicos().getByText(TECNICO)).toBeInTheDocument();
    expect(secaoServicos().queryByText('Nenhum serviço nesta reserva.')).not.toBeInTheDocument();
  });

  it('sem serviço, segue dizendo que não há', async () => {
    await renderFicha({ ...RESERVA, services: [], items: [RESERVA.items[0]] });
    expect(secaoServicos().getByText('Nenhum serviço nesta reserva.')).toBeInTheDocument();
  });
});
