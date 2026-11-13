import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { bookingAPI, pdfText, autoTable } = vi.hoisted(() => ({
  bookingAPI: { getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn() },
  pdfText: vi.fn(),
  autoTable: vi.fn(),
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
vi.mock('jspdf-autotable', () => ({ default: autoTable }));
vi.mock('jspdf', () => ({
  jsPDF: class {
    text = pdfText;
    splitTextToSize = (texto: string) => [texto];
    setFillColor() {}
    rect() {}
    addImage() {}
    setTextColor() {}
    setFontSize() {}
    setFont() {}
    setDrawColor() {}
    setLineWidth() {}
    line() {}
    textWithLink() {}
    save() {}
  },
}));

import BookingDetailPage from '../BookingDetailPage';
import { formatPrice } from '../../../utils/formatPrice';

// Auditoria do orçamento (12/11/2026), O3: o pedido do briefing (sem itens, total zero) aparecia "R$ 0,00" no card
// "Valor da reserva" da ficha e no "VALOR FINAL DA PROPOSTA" do PDF do painel. Agora "Em preparação", como na área
// do cliente.
const PEDIDO_DO_BRIEFING = {
  id: 'XP-ANA-20270110', status: 'PENDING', deliveryStatus: 'PENDING', totalPrice: '0.00', discountAmount: null,
  eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T01:00:00.000Z', location: 'A definir',
  clientId: null, client: null, clientName: 'Ana Souza', clientContact: '31988887777', clientEmail: 'ana@cliente.test',
  attachments: [], equipments: [], services: [], eventCollaborators: [],
  pricing: { lines: [], itemsSubtotal: 0, couponDiscount: null, adjustment: 0, total: 0 },
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

const valorFinalDoPdf = () => {
  const i = pdfText.mock.calls.findIndex((c) => c[0] === 'VALOR FINAL DA PROPOSTA:');
  return pdfText.mock.calls[i + 1]?.[0];
};

describe('BookingDetailPage — total zero sai "Em preparação" (O3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sem rede')));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('card "Valor da reserva": "Em preparação", não "R$ 0,00"', async () => {
    await renderFicha(PEDIDO_DO_BRIEFING);

    const card = screen.getByText('Valor da reserva').closest('div')!.parentElement as HTMLElement;
    expect(card).toHaveTextContent('Em preparação');
    expect(card.textContent).not.toMatch(/R\$\s*0,00/);
  });

  it('PDF do painel: "VALOR FINAL DA PROPOSTA" com "Em preparação"', async () => {
    await renderFicha(PEDIDO_DO_BRIEFING);

    fireEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }));

    await waitFor(() => expect(autoTable).toHaveBeenCalledTimes(1));
    expect(valorFinalDoPdf()).toBe('Em preparação');
  });

  it('com valor, o card mostra o total da reserva', async () => {
    await renderFicha({ ...PEDIDO_DO_BRIEFING, totalPrice: '1350.00', pricing: { ...PEDIDO_DO_BRIEFING.pricing, total: 1350 } });

    const card = screen.getByText('Valor da reserva').closest('div')!.parentElement as HTMLElement;
    expect(card.textContent?.replace(/\s/g, ' ')).toContain(formatPrice(1350).replace(/\s/g, ' '));
  });
});
