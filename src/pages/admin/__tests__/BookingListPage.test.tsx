import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch, useAuth } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));

import BookingListPage from '../BookingListPage';

const booking = (i: number) => ({
  id: `XP-${i}`, status: 'PENDING', totalPrice: '100', eventDate: '2027-01-10T18:00:00.000Z',
  client: { id: `c${i}`, user: { id: `u${i}`, name: `Cliente ${i}`, email: `c${i}@t.com` } },
});

// A tela chamava GET /admin/bookings sem parâmetros: a API devolve só a 1ª página (20, as mais
// antigas por data do evento) e a lista do admin nunca mostrava as demais reservas.
describe('BookingListPage — carrega todas as reservas', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    apiFetch.mockImplementation((url: string) => {
      const page = Number(new URL(url, 'http://x').searchParams.get('page') || '1');
      if (page === 1) return Promise.resolve(Array.from({ length: 100 }, (_, i) => booking(i)));
      if (page === 2) return Promise.resolve(Array.from({ length: 30 }, (_, i) => booking(100 + i)));
      return Promise.resolve([]);
    });
  });

  it('130 reservas no banco → a lista mostra as 130 (antes: só a 1ª página)', async () => {
    render(<MemoryRouter initialEntries={['/admin/reservas']}><BookingListPage /></MemoryRouter>);
    expect(await screen.findByText(/Mostrando 130 de 130 registros/)).toBeInTheDocument();
  });
});
