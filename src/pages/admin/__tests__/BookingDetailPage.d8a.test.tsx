import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { bookingAPI, addNotification, quotePdfAPI } = vi.hoisted(() => ({
  bookingAPI: { getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn() },
  addNotification: vi.fn(),
  quotePdfAPI: { forAdmin: vi.fn() },
}));
vi.mock('../../../services/api', () => ({ bookingAPI, quotePdfAPI, api: { post: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('@/hooks/useCollaborators', () => ({ useCollaborators: () => ({ collaborators: [], fetchCollaborators: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));
vi.mock('@/components/bookings/BookingCollaborators', () => ({ BookingCollaborators: () => null }));
vi.mock('@/components/bookings/BookingFinancialSummary', () => ({ BookingFinancialSummary: () => null }));
vi.mock('../../../components/modals/EventManagement', () => ({ EventManagement: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import BookingDetailPage from '../BookingDetailPage';

// A mesma reserva do teste da página do cliente e do PDF do cliente: total R$ 1.350,00 (itens 1.500 −
// cupom 150), com o resumo de preço que GET /bookings/:id manda (pricing).
const RESERVA = {
  id: 'XP-ANA-20270110', status: 'CONFIRMED', deliveryStatus: 'PENDING', totalPrice: '1350.00', discountAmount: '150.00',
  eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T02:00:00.000Z', location: 'Espaço VIP',
  clientId: null, client: null, clientName: 'Ana Souza', clientContact: '31988887777', clientEmail: 'ana@cliente.test',
  attachments: [],
  kit: { id: 'kit1', name: 'Kit Festa', price: 120 },
  equipments: [{ id: 'eq1', name: 'Mesa de Som', pricePerHour: 50 }],
  services: [{ id: 'sv1', name: 'Operador', price: 200 }],
  eventCollaborators: [{ id: 'ec1', role: 'DJ', fixedRate: 500, totalHours: 5, collaborator: { name: 'Bruno Lima' } }],
  pricing: {
    lines: [
      { description: 'Kit Festa (5 h)', quantity: 1, unitPrice: 1200, discount: 0, total: 1200, type: 'KIT', equipmentId: null, serviceId: null, kitId: 'kit1' },
      { description: 'Técnico', quantity: 1, unitPrice: 300, discount: 0, total: 300, type: 'CUSTOM', equipmentId: null, serviceId: null, kitId: null },
      { description: 'Frete (dentro de BH)', quantity: 1, unitPrice: 0, discount: 0, total: 0, type: 'CUSTOM', equipmentId: null, serviceId: null, kitId: null },
    ],
    itemsSubtotal: 1500,
    couponDiscount: { amount: 150, code: 'PROMO' },
    adjustment: 0,
    total: 1350,
  },
};

const renderFicha = async (reserva: object = RESERVA) => {
  bookingAPI.getById.mockResolvedValue({ data: reserva });
  render(
    <MemoryRouter initialEntries={['/admin/reservas/XP']}>
      <Routes><Route path="/admin/reservas/:id" element={<BookingDetailPage />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: /^Reserva / });
};

// D8a e P16 (aprovadas em 02/11/2026): o PDF do painel, que ia ao cliente pelo "PDF + WhatsApp",
// recalculava pelo catálogo × (eventDuration || 4) — serviço multiplicado por horas, equipamento por campos
// que não existem (R$ 0) — e listava o cachê de cada colaborador como linha do cliente. Auditoria do orçamento
// (12/11/2026), E8: o "PDF + WhatsApp" saiu (o cliente recebe o link da proposta). Orçamento em PDF (13/11/2026): o PDF
// da ficha é o orçamento do servidor, com as linhas e o total da reserva (backend/src/services/pdf/__tests__).
describe('BookingDetailPage — o PDF do painel é o orçamento do servidor (D8a)', () => {
  let open: MockInstance<typeof window.open>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sem rede')));
    open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
  });

  afterEach(() => {
    open.mockRestore();
    vi.unstubAllGlobals();
  });

  // Auditoria do orçamento (12/11/2026), E8: antes o "PDF + WhatsApp" abria o WhatsApp com o total do dia ("Segue em
  // PDF a proposta") e baixava o PDF para anexar; o PDF parado divergia do link depois de qualquer mudança.
  it('sem "PDF + WhatsApp": "Baixar orçamento (PDF)" só baixa o orçamento do servidor, sem abrir o WhatsApp', async () => {
    quotePdfAPI.forAdmin.mockResolvedValue(undefined);
    await renderFicha();
    expect(screen.queryByRole('button', { name: 'PDF + WhatsApp' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Baixar orçamento (PDF)' }));

    await waitFor(() => expect(quotePdfAPI.forAdmin).toHaveBeenCalledWith('XP-ANA-20270110'));
    expect(open).not.toHaveBeenCalled();
    expect(addNotification).not.toHaveBeenCalled();
  });

  it('o servidor recusa: o aviso diz o motivo, e o botão volta', async () => {
    quotePdfAPI.forAdmin.mockRejectedValue(Object.assign(new Error('Reserva não encontrada'), { status: 404 }));
    await renderFicha();

    fireEvent.click(screen.getByRole('button', { name: 'Baixar orçamento (PDF)' }));

    await waitFor(() =>
      expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', title: 'Erro no PDF', message: 'Reserva não encontrada' })),
    );
    expect(screen.getByRole('button', { name: 'Baixar orçamento (PDF)' })).toBeEnabled();
  });
});
