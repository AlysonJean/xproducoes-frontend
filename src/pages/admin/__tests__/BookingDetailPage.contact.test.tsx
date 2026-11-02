import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// Como GET /bookings/:id devolve ao admin. A reserva que a Proposta Rápida pendurou no cadastro de
// cliente do próprio admin (antes de 89ef066): o telefone do cadastro é o da PRIMEIRA proposta manual,
// de outro cliente; o contato desta reserva está nela mesma.
const reservaNoCadastroDoAdmin = {
  id: 'XP-ANA-20270110', status: 'CONFIRMED', deliveryStatus: 'PENDING', totalPrice: '300',
  eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T02:00:00.000Z', location: 'Espaço VIP',
  clientId: 'cli-admin',
  client: { id: 'cli-admin', phone: '31911112222', user: { id: 'a1', name: 'Dono da Empresa', email: 'dono@empresa.test' } },
  clientName: 'Ana Souza', clientContact: '(31) 98888-7777', clientEmail: 'ana@cliente.test',
  attachments: [], equipments: [], services: [], eventCollaborators: [],
};
// Cliente digitado pelo admin (sem cadastro): client nulo.
const reservaDigitada = {
  ...reservaNoCadastroDoAdmin, id: 'XP-BRUNO-20270110', clientId: null, client: null,
  clientName: 'Bruno Lima', clientContact: '31977776666', clientEmail: null,
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

const waMe = (open: MockInstance<typeof window.open>) => {
  const url = new URL(String(open.mock.calls[0][0]));
  return `${url.origin}${url.pathname}`;
};

// Achado (auditoria ponta a ponta): os botões manuais da ficha (PDF + WhatsApp, avisos de status) e o
// PDF usavam o telefone e o e-mail do cadastro antes dos informados na reserva — a proposta de Ana ia
// para o WhatsApp de outro cliente —, e os avisos de status abriam o wa.me sem o DDI (31 é a Holanda).
// O servidor já usa o contato da reserva primeiro (whatsappService.bookingPhone).
describe('BookingDetailPage — contato do cliente nos botões manuais', () => {
  let open: MockInstance<typeof window.open>;

  beforeEach(() => {
    vi.clearAllMocks();
    bookingAPI.updateDeliveryStatus.mockResolvedValue({});
    open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
  });

  afterEach(() => {
    open.mockRestore();
  });

  it('a ficha mostra o contato da reserva, não o do cadastro', async () => {
    await renderFicha(reservaNoCadastroDoAdmin);

    expect(screen.getByText('(31) 98888-7777')).toBeInTheDocument();
    expect(screen.getByText('ana@cliente.test')).toBeInTheDocument();
    expect(screen.queryByText('31911112222')).not.toBeInTheDocument();
    expect(screen.queryByText('dono@empresa.test')).not.toBeInTheDocument();
  });

  it('"PDF + WhatsApp": o PDF e a conversa usam o contato da reserva, com DDI', async () => {
    await renderFicha(reservaNoCadastroDoAdmin);

    fireEvent.click(screen.getByRole('button', { name: 'PDF + WhatsApp' }));

    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(waMe(open)).toBe('https://wa.me/5531988887777');
    const escritos = pdfText.mock.calls.map((c) => c[0]);
    expect(escritos).toContain('(31) 98888-7777');
    expect(escritos).toContain('ana@cliente.test');
    expect(escritos).not.toContain('31911112222');
  });

  it('PDF de cliente cadastrado sem e-mail na reserva: usa o e-mail da conta (antes: "-")', async () => {
    await renderFicha({
      ...reservaNoCadastroDoAdmin, clientEmail: null,
      client: { id: 'cli-1', phone: '31955554444', user: { id: 'u1', name: 'Carla Dias', email: 'carla@cliente.test' } },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }));

    await waitFor(() => expect(pdfText).toHaveBeenCalledWith('carla@cliente.test', 112, expect.any(Number)));
  });

  it.each([
    ['reserva no cadastro do admin', reservaNoCadastroDoAdmin, '5531988887777'],
    ['cliente digitado (sem cadastro)', reservaDigitada, '5531977776666'],
  ])('aviso "equipe a caminho" (%s): mostra e abre o número da reserva com DDI', async (_caso, reserva, numero) => {
    await renderFicha(reserva);

    fireEvent.click(screen.getByRole('button', { name: 'Avisar: equipe a caminho' }));
    expect(await screen.findByText(numero)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar via WhatsApp' }));

    expect(open).toHaveBeenCalledTimes(1);
    expect(waMe(open)).toBe(`https://wa.me/${numero}`);
    await waitFor(() => expect(bookingAPI.updateDeliveryStatus).toHaveBeenCalledWith(reserva.id, 'ON_THE_WAY'));
  });

  // Sem telefone válido o botão não muda o status (antes abria o wa.me quebrado e mudava): o aviso diz
  // onde mudar.
  it.each([
    ['sem contato', null],
    ['número curto, sem DDD', '9888-7777'],
  ])('sem telefone válido (%s): avisa onde mudar o status e não abre o WhatsApp', async (_caso, contato) => {
    await renderFicha({ ...reservaDigitada, clientContact: contato });

    fireEvent.click(screen.getByRole('button', { name: 'Avisar: equipe a caminho' }));

    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'warning', title: 'Sem telefone', message: expect.stringContaining('lista de Reservas'),
    }));
    expect(screen.queryByRole('button', { name: 'Enviar via WhatsApp' })).not.toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
  });

  // A edição nunca gravou o status e agora nem o mostra: o texto não pode mandar usar o Editar.
  it('reserva confirmada: indica onde o status muda de verdade', async () => {
    await renderFicha(reservaNoCadastroDoAdmin);

    expect(screen.getByText(/Para mudar o status, use os botões de Logística ou a lista de Reservas/)).toBeInTheDocument();
    expect(screen.queryByText(/Use o botão Editar para mudar o status/)).not.toBeInTheDocument();
  });
});
