import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch, useAuth, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn(), addNotification: vi.fn() }));
vi.mock('xlsx-js-style', () => ({ default: {} }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));

import BookingListPage from '../BookingListPage';

// P3 (aprovado em 02/11/2026): o cartão "pedidos aguardando resposta" do painel abre
// /admin/reservas?status=PENDING, e a lista já vem filtrada em Pendentes. Valor fora das opções é ignorado.
const base = { totalPrice: '300', eventDate: '2027-01-10T21:00:00.000Z', client: null, clientContact: null };
const reservas = [
  { ...base, id: 'XP-PENDENTE', status: 'PENDING', clientName: 'Ana Pendente' },
  { ...base, id: 'XP-CONFIRMADA', status: 'CONFIRMED', clientName: 'Bia Confirmada' },
];

const abrir = async (url: string) => {
  render(<MemoryRouter initialEntries={[url]}><BookingListPage /></MemoryRouter>);
  await screen.findByText('Ana Pendente');
};

describe('BookingListPage — filtro de status pelo endereço', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    apiFetch.mockImplementation((url: string) => Promise.resolve(url.startsWith('/admin/bookings?page=1') ? reservas : []));
  });

  it('?status=PENDING: abre filtrada em Pendentes', async () => {
    await abrir('/admin/reservas?status=PENDING');
    expect(screen.getByLabelText('Filtrar por status')).toHaveValue('PENDING');
    expect(screen.queryByText('Bia Confirmada')).toBeNull();
  });

  it('sem parâmetro ou com valor inválido: todos os status', async () => {
    await abrir('/admin/reservas?status=QUALQUER');
    expect(screen.getByLabelText('Filtrar por status')).toHaveValue('all');
    expect(screen.getByText('Bia Confirmada')).toBeInTheDocument();
  });
});
