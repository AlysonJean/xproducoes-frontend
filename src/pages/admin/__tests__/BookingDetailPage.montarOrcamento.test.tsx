import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const { bookingAPI, quotePdfAPI } = vi.hoisted(() => ({
  bookingAPI: { getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn() },
  quotePdfAPI: { forAdmin: vi.fn() },
}));
vi.mock('../../../services/api', () => ({ bookingAPI, quotePdfAPI, api: { post: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('@/hooks/useCollaborators', () => ({ useCollaborators: () => ({ collaborators: [], fetchCollaborators: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));
vi.mock('@/components/bookings/BookingCollaborators', () => ({ BookingCollaborators: () => null }));
vi.mock('@/components/bookings/BookingFinancialSummary', () => ({ BookingFinancialSummary: () => null }));
vi.mock('../../../components/proposal/AdminContractCard', () => ({ AdminContractCard: () => null }));
vi.mock('../../../components/modals/EventManagement', () => ({ EventManagement: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import BookingDetailPage from '../BookingDetailPage';

// 18/11/2026: "não consigo adicionar kits ou equipamentos na reserva para gerar um orçamento a partir do briefing do
// cliente". A edição mostra os itens só para leitura, e a ficha não tinha outro caminho. Agora a ficha leva à Proposta
// Rápida da reserva ("Montar orçamento"), com a regra do servidor: proposta em aberto, fora do histórico, sem contrato
// aceito.
const CODIGO = 'XP-LUCAS-20261116-1430-8K2';
const PEDIDO_DO_BRIEFING = {
  id: CODIGO, status: 'PENDING', deliveryStatus: 'PENDING', totalPrice: '0.00', discountAmount: null,
  eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T01:00:00.000Z', location: 'Salão do hotel',
  clientId: null, client: null, clientName: 'Lucas Prado', clientContact: '31977776666', clientEmail: 'lucas@cliente.test',
  specialRequests: 'Som para 150 pessoas.', attachments: [], equipments: [], services: [], eventCollaborators: [], items: [],
  pricing: { lines: [], itemsSubtotal: 0, couponDiscount: null, adjustment: 0, total: 0 },
};
const COM_ITENS = {
  ...PEDIDO_DO_BRIEFING, totalPrice: '1200.00',
  items: [{ description: 'Kit Festa (5 h incluídas)', quantity: 1, unitPrice: 1200, discount: 0, totalPrice: 1200, itemType: 'KIT', kitId: 'kit1' }],
  pricing: { lines: [{ description: 'Kit Festa (5 h incluídas)', quantity: 1, unitPrice: 1200, discount: 0, total: 1200, type: 'KIT' }], itemsSubtotal: 1200, couponDiscount: null, adjustment: 0, total: 1200 },
};

const Destino = () => {
  const { pathname, search } = useLocation();
  return <p>Destino: {pathname}{search}</p>;
};

const renderFicha = async (reserva: object) => {
  bookingAPI.getById.mockResolvedValue({ data: reserva });
  render(
    <MemoryRouter initialEntries={['/admin/reservas/XP']}>
      <Routes>
        <Route path="/admin/reservas/:id" element={<BookingDetailPage />} />
        <Route path="/admin/orcamentos/novo" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: /^Reserva / });
};

describe('BookingDetailPage — Montar orçamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sem rede')));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pedido do briefing sem itens: "Montar orçamento" nos Itens e no briefing, levando à Proposta Rápida da reserva', async () => {
    await renderFicha(PEDIDO_DO_BRIEFING);

    expect(screen.getByText(/Esta reserva ainda não tem itens\. Use "Montar orçamento"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Montar orçamento a partir do briefing' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Montar orçamento' }));

    expect(await screen.findByText(`Destino: /admin/orcamentos/novo?reserva=${encodeURIComponent(CODIGO)}`)).toBeInTheDocument();
  });

  it('o botão do briefing leva ao mesmo lugar', async () => {
    await renderFicha(PEDIDO_DO_BRIEFING);
    fireEvent.click(screen.getByRole('button', { name: 'Montar orçamento a partir do briefing' }));

    expect(await screen.findByText(`Destino: /admin/orcamentos/novo?reserva=${encodeURIComponent(CODIGO)}`)).toBeInTheDocument();
  });

  it('reserva com itens e proposta em aberto: "Refazer orçamento", sem o texto de reserva vazia nem o botão do briefing', async () => {
    await renderFicha(COM_ITENS);

    expect(screen.getByRole('button', { name: 'Refazer orçamento' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Montar orçamento' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Esta reserva ainda não tem itens/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Montar orçamento a partir do briefing' })).not.toBeInTheDocument();
  });

  it.each([
    ['confirmada', { status: 'CONFIRMED' }],
    ['cancelada', { status: 'CANCELLED' }],
    ['com contrato aceito', { contractSummary: { state: 'ACCEPTED', acceptedAt: '2026-11-17T04:00:00Z', withdrawUntil: null } }],
    ['do histórico', { idempotencyKey: 'HIST-2024-0001' }],
  ])('reserva %s: nenhum botão de orçamento', async (_nome, extra) => {
    await renderFicha({ ...PEDIDO_DO_BRIEFING, ...extra });

    expect(screen.queryByRole('button', { name: /orçamento$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Montar orçamento a partir do briefing' })).not.toBeInTheDocument();
  });
});
