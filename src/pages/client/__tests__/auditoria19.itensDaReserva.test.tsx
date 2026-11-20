import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch, bookingAPI, authAPI, kitAPI } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  bookingAPI: { getMyBookings: vi.fn(), getUpcoming: vi.fn() },
  authAPI: { getStats: vi.fn(), getFavorites: vi.fn() },
  kitAPI: { getRecommended: vi.fn() },
}));
vi.mock('../../../services/api', () => ({ apiFetch, bookingAPI, authAPI, kitAPI }));
vi.mock('@/services/api', () => ({ apiFetch, bookingAPI, authAPI, kitAPI }));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Ana Souza', email: 'ana@cliente.test', role: 'CLIENT' } }),
}));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
// O que o painel mostra além das reservas não importa aqui.
vi.mock('../../../hooks/useRecommendations', () => {
  const vazio = { recommendations: [], loading: false };
  return { useMultipleRecommendations: () => ({ personalized: vazio, trending: vazio, newItems: vazio }) };
});
vi.mock('../../../components/ui/RecommendationSection', () => ({ RecommendationSection: () => null }));
vi.mock('../../../components/ui/ReferralCard', () => ({ ReferralCard: () => null }));
vi.mock('../../../components/modals/ReviewModal', () => ({ ReviewModal: () => null }));

import { BookingDetailsModal } from '../ClientCalendarPage';
import { ClientDashboardPage } from '../ClientDashboardPage';

// Auditoria completa (19/11/2026): a agenda e o painel do cliente liam equipments[].equipment.name, kits[] e venue, mas o
// GET /bookings/user manda equipments[].name, o kit em `kit` e o endereço nos campos da reserva. Os equipamentos viravam
// "Equipamento", o kit não entrava na contagem nem na lista, e o endereço não aparecia (nem no Google Agenda).
const inicio = new Date('2027-01-10T21:00:00.000Z');
const FORMA_ATUAL = {
  id: 'XP-ANA-20270110', eventTitle: 'Formatura', status: 'CONFIRMED', totalPrice: '1500', eventDate: inicio.toISOString(),
  equipments: [{ id: 'eq1', name: 'Caixa ativa 15 pol' }],
  kit: { id: 'k5', name: 'Kit 05' },
  street: 'Rua A', addressNumber: '10', neighborhood: 'Savassi', city: 'Belo Horizonte', state: 'MG', zipCode: '30140-000',
};
const ENDERECO = 'Rua A, 10, Savassi, Belo Horizonte - MG, CEP 30140-000';

const abrir = (booking: object) =>
  render(
    <MemoryRouter>
      <BookingDetailsModal event={{ title: 'Evento', start: inicio, end: inicio, resource: booking } as never} onClose={vi.fn()} />
    </MemoryRouter>,
  );
const itensDaJanela = () =>
  Array.from(screen.getByRole('heading', { name: 'Itens' }).nextElementSibling!.children).map((el) => el.textContent);

describe('Agenda do cliente: itens e endereço na janela da reserva (auditoria de 19/11/2026)', () => {
  let open: MockInstance<typeof window.open>;

  beforeEach(() => {
    open = vi.spyOn(window, 'open').mockReturnValue(null);
  });

  afterEach(() => {
    open.mockRestore();
  });

  it('forma atual: kit e equipamento pelo nome, "2 itens", o endereço; o Google Agenda leva o kit e o endereço', () => {
    abrir(FORMA_ATUAL);

    expect(screen.getByText('2 itens')).toBeInTheDocument();
    expect(itensDaJanela()).toEqual(['Kit 05', 'Caixa ativa 15 pol']);
    expect(screen.queryByText('Equipamento')).not.toBeInTheDocument();
    expect(screen.getByText(ENDERECO)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Google Agenda' }));
    const url = new URL(String(open.mock.calls[0][0]));
    expect(url.searchParams.get('location')).toBe(ENDERECO);
    expect(url.searchParams.get('details')).toContain('Kit: Kit 05');
    expect(url.searchParams.get('details')).toContain('Equipamentos: Caixa ativa 15 pol');
  });

  it('reserva só de kit: "1 item" com o kit na lista', () => {
    abrir({ ...FORMA_ATUAL, equipments: [], street: null, addressNumber: null, neighborhood: null, city: null, state: null, zipCode: null });

    expect(screen.getByText('1 item')).toBeInTheDocument();
    expect(itensDaJanela()).toEqual(['Kit 05']);
  });

  it('forma antiga (equipments[].equipment, kits[] e venue) continua lida', () => {
    abrir({
      id: 'XP-ANA-1', status: 'PENDING', totalPrice: '300', eventDate: inicio.toISOString(),
      equipments: [{ equipmentId: 'eq3', equipment: { name: 'Mesa de som 16 canais' } }],
      kits: [{ kitId: 'k1', kit: { name: 'Kit 01' } }],
      venue: { street: 'Av. Brasil, 100', city: 'Belo Horizonte' },
    });

    expect(screen.getByText('2 itens')).toBeInTheDocument();
    expect(itensDaJanela()).toEqual(['Kit 01', 'Mesa de som 16 canais']);
    expect(screen.getByText('Av. Brasil, 100, Belo Horizonte')).toBeInTheDocument();
  });
});

describe('Painel do cliente: próximas reservas contam o kit (auditoria de 19/11/2026)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authAPI.getStats.mockResolvedValue({ data: { totalBookings: 1, activeBookings: 1, completedBookings: 0, totalSpent: 0, averageBookingValue: 0 } });
    authAPI.getFavorites.mockResolvedValue({ data: [] });
    kitAPI.getRecommended.mockResolvedValue({ data: [] });
  });

  it('reserva só de kit: "1 item(ns)" (antes "0 equipamento(s)") e, em Reservas Recentes, o kit no lugar de "Nenhum equipamento"', async () => {
    const soDeKit = { ...FORMA_ATUAL, equipments: [] };
    bookingAPI.getUpcoming.mockResolvedValue({ data: [soDeKit] });
    bookingAPI.getMyBookings.mockResolvedValue({ data: [soDeKit] });

    render(
      <MemoryRouter>
        <ClientDashboardPage />
      </MemoryRouter>,
    );

    const proximas = (await screen.findByRole('heading', { name: 'Próximas Reservas' })).closest('div.p-6') as HTMLElement;
    const linha = within(proximas).getByRole('link', { name: /item\(ns\)/ });
    expect(linha).toHaveAttribute('href', '/cliente/reservas/XP-ANA-20270110');
    expect(linha.textContent).toMatch(/1 item\(ns\) - R\$\s*1\.500,00/);
    expect(proximas.textContent).not.toMatch(/equipamento\(s\)/);

    const recentes = screen.getByRole('heading', { name: 'Reservas Recentes' }).closest('div.p-6') as HTMLElement;
    expect(within(recentes).getByText('Kit 05')).toBeInTheDocument();
    expect(within(recentes).queryByText(/Nenhum equipamento listado/)).not.toBeInTheDocument();
    expect(within(recentes).getByText(ENDERECO)).toBeInTheDocument();
  });
});
