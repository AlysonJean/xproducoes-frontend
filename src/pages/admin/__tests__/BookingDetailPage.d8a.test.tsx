import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { bookingAPI, addNotification, pdfText, autoTable } = vi.hoisted(() => ({
  bookingAPI: { getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn() },
  addNotification: vi.fn(),
  pdfText: vi.fn(),
  autoTable: vi.fn(),
}));
vi.mock('../../../services/api', () => ({ bookingAPI, api: { post: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
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

const linhasDoPdf = () => autoTable.mock.calls[0][1].body as string[][];
const valorFinalDoPdf = () => {
  const i = pdfText.mock.calls.findIndex((c) => c[0] === 'VALOR FINAL DA PROPOSTA:');
  return pdfText.mock.calls[i + 1]?.[0];
};

// D8a e P16 (aprovadas em 02/11/2026): o PDF do painel, que vai ao cliente pelo "PDF + WhatsApp",
// recalculava pelo catálogo × (eventDuration || 4) — serviço multiplicado por horas, equipamento por campos
// que não existem (R$ 0) — e listava o cachê de cada colaborador como linha do cliente. Agora mostra as
// mesmas linhas e o mesmo total da página do cliente e do PDF do cliente.
describe('BookingDetailPage — o PDF e o WhatsApp do painel usam o total da reserva (D8a)', () => {
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

  it('PDF: as linhas gravadas, sem a linha do cachê da equipe, e o valor final da API', async () => {
    await renderFicha();

    fireEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }));

    await waitFor(() => expect(autoTable).toHaveBeenCalledTimes(1));
    expect(linhasDoPdf()).toEqual([
      ['', 'Kit Festa (5 h)', 'Kit', '1', formatPrice(1200), formatPrice(0), formatPrice(1200)],
      ['', 'Técnico', 'Adicional', '1', formatPrice(300), formatPrice(0), formatPrice(300)],
      ['', 'Frete (dentro de BH)', 'Adicional', '1', formatPrice(0), formatPrice(0), formatPrice(0)],
    ]);
    expect(JSON.stringify(linhasDoPdf())).not.toContain('Bruno Lima');
    expect(valorFinalDoPdf()).toBe(formatPrice(1350));
    const escritos = pdfText.mock.calls.map((c) => c[0]);
    expect(escritos).toContain('Desconto (PROMO):');
    expect(escritos).toContain(`- ${formatPrice(150)}`);
  });

  // P14 parte 2 (aprovada em 02/11/2026): o texto vem de utils/whatsappTemplates (proposalPdfWhatsAppText), com o
  // total da mesma função de preço; o WhatsApp abre no clique, antes de o PDF terminar.
  it('"PDF + WhatsApp": a mensagem leva o mesmo total do PDF', async () => {
    await renderFicha();

    fireEvent.click(screen.getByRole('button', { name: 'PDF + WhatsApp' }));

    expect(open).toHaveBeenCalledTimes(1);
    const mensagem = new URL(String(open.mock.calls[0][0])).searchParams.get('text') ?? '';
    expect(mensagem).toContain('Valor total: R$ 1.350,00.');
    await waitFor(() => expect(valorFinalDoPdf()).toBe(formatPrice(1350)));
  });

  it('reserva antiga sem itens gravados: o PDF lista só os nomes e o valor final é o totalPrice', async () => {
    await renderFicha({ ...RESERVA, pricing: undefined, totalPrice: '900.00', discountAmount: null });

    fireEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }));

    await waitFor(() => expect(autoTable).toHaveBeenCalledTimes(1));
    expect(linhasDoPdf().map((l) => [l[1], l[6]])).toEqual([
      ['Kit Festa', 'Incluído'], ['Mesa de Som', 'Incluído'], ['Operador', 'Incluído'],
    ]);
    expect(valorFinalDoPdf()).toBe(formatPrice(900));
  });
});
