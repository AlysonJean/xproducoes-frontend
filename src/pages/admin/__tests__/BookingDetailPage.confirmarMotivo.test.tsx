// Auditoria do orçamento (12/11/2026), O33 e pedido do plano "edicao" (junção da onda 2): o "Confirmar reserva" da ficha
// mandava valor zero ou negativo ao servidor (que responde só "Dados de entrada inválidos") e, em qualquer recusa,
// mostrava "Não foi possível confirmar a reserva." no lugar do motivo (409 de equipamento em uso, por exemplo).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { bookingAPI, addNotification, pdfText } = vi.hoisted(() => ({
  bookingAPI: { getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn() },
  addNotification: vi.fn(),
  pdfText: vi.fn(),
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
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
// O PDF de verdade não importa aqui: só o que ele escreve na seção do cliente.
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

const pendente = {
  id: 'XP-ANA-20270110', status: 'PENDING', deliveryStatus: 'PENDING', totalPrice: '300',
  eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T02:00:00.000Z', location: 'Espaço VIP',
  clientId: null, client: null, clientName: 'Ana Souza', clientContact: '31988887777', clientEmail: 'ana@cliente.test',
  attachments: [], equipments: [], services: [], eventCollaborators: [],
};

const abrirConfirmacao = async () => {
  bookingAPI.getById.mockResolvedValue({ data: pendente });
  render(
    <MemoryRouter initialEntries={['/admin/reservas/XP']}>
      <Routes><Route path="/admin/reservas/:id" element={<BookingDetailPage />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: /^Reserva / });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));
  return screen.findByRole('dialog');
};

describe('Ficha — "Confirmar reserva" com o motivo da recusa', () => {
  beforeEach(() => vi.clearAllMocks());

  it('o campo diz que o valor inclui frete e pedágio; zero ou negativo não vai ao servidor', async () => {
    const janela = await abrirConfirmacao();
    const campo = within(janela).getByLabelText('Valor final, com frete e pedágio (R$)');
    fireEvent.change(campo, { target: { value: '-5' } });
    fireEvent.click(within(janela).getByRole('button', { name: 'Confirmar reserva' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error', message: 'O valor final precisa ser maior que zero. Em branco, fica o valor de hoje.',
    })));
    expect(bookingAPI.confirmWithDetails).not.toHaveBeenCalled();
  });

  it('recusa do servidor (409): a notificação traz o motivo do servidor', async () => {
    bookingAPI.confirmWithDetails.mockRejectedValue(Object.assign(new Error('Equipamento em uso no evento "Casamento Bia" na mesma data.'), { status: 409 }));
    const janela = await abrirConfirmacao();
    fireEvent.click(within(janela).getByRole('button', { name: 'Confirmar reserva' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error', title: 'Erro ao confirmar', message: 'Equipamento em uso no evento "Casamento Bia" na mesma data.',
    })));
  });
});
