import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const { bookingAPI } = vi.hoisted(() => ({
  bookingAPI: {
    getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn(),
    sendProposal: vi.fn(), getAuditHistory: vi.fn(),
  },
}));
vi.mock('../../../services/api', () => ({ bookingAPI, api: { post: vi.fn(), delete: vi.fn() }, apiFetch: vi.fn().mockResolvedValue({}) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('@/hooks/useCollaborators', () => ({ useCollaborators: () => ({ collaborators: [], fetchCollaborators: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));
vi.mock('@/components/bookings/BookingCollaborators', () => ({ BookingCollaborators: () => null }));
vi.mock('@/components/bookings/BookingFinancialSummary', () => ({ BookingFinancialSummary: () => null }));
vi.mock('../../../components/modals/EventManagement', () => ({ EventManagement: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
vi.mock('jspdf', () => ({ jsPDF: class {} }));

import BookingDetailPage from '../BookingDetailPage';

// Auditoria do orçamento (12/11/2026), E8, onda 2: a Proposta Rápida, depois de salvar, abre a ficha com
// location.state = { sendProposal: true } (antes ela oferecia "PDF + WhatsApp"). A ficha leva o admin até o "Enviar
// proposta" (rola e põe o foco no botão), sem enviar nada sozinha, e limpa o estado para não repetir ao recarregar.
const RESERVA = {
  id: 'XP-ANA-20270110', status: 'DRAFT', deliveryStatus: 'PENDING', totalPrice: '900.00',
  eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T01:00:00.000Z', location: 'Salão Azul',
  clientId: null, client: null, clientName: 'Ana Souza', clientContact: '(31) 98888-7777', clientEmail: 'ana@cliente.test',
  attachments: [], equipments: [], services: [], eventCollaborators: [],
  pricing: { lines: [], itemsSubtotal: 900, couponDiscount: null, adjustment: 0, total: 900 },
};

// Mostra o estado da navegação, para conferir que ele foi limpo.
function EstadoDaNavegacao() {
  const location = useLocation();
  return (
    <>
      <output aria-label="Estado da navegação">{JSON.stringify(location.state ?? null)}</output>
      <output aria-label="Endereço da navegação">{`${location.pathname}${location.search}${location.hash}`}</output>
    </>
  );
}

const abrirFicha = async (reserva: object, state?: unknown, search = '') => {
  bookingAPI.getById.mockResolvedValue({ data: reserva });
  render(
    <MemoryRouter initialEntries={[{ pathname: '/admin/reservas/XP-ANA-20270110', search, state }]}>
      <Routes>
        <Route path="/admin/reservas/:id" element={<><BookingDetailPage /><EstadoDaNavegacao /></>} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: /^Reserva / });
};

describe('Ficha aberta pela Proposta Rápida ({ sendProposal: true })', () => {
  const rolar = vi.fn();
  const scrollOriginal = Element.prototype.scrollIntoView;

  beforeEach(() => {
    vi.clearAllMocks();
    bookingAPI.getAuditHistory.mockResolvedValue({ data: [] });
    Element.prototype.scrollIntoView = rolar;
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = scrollOriginal;
  });

  it('rascunho: rola até o "Enviar proposta", põe o foco nele, não envia e limpa o estado', async () => {
    await abrirFicha(RESERVA, { sendProposal: true }, '?origem=rapida');

    const enviar = screen.getByRole('button', { name: 'Enviar proposta' });
    await waitFor(() => expect(enviar).toHaveFocus());
    expect(rolar).toHaveBeenCalledTimes(1);
    expect(rolar.mock.contexts[0]).toBe(enviar);
    await waitFor(() => expect(screen.getByLabelText('Estado da navegação')).toHaveTextContent('null'));
    // Limpar o estado não leva junto a busca do endereço.
    expect(screen.getByLabelText('Endereço da navegação')).toHaveTextContent('/admin/reservas/XP-ANA-20270110?origem=rapida');
    expect(bookingAPI.sendProposal).not.toHaveBeenCalled();
    expect(bookingAPI.getById).toHaveBeenCalledTimes(1);
  });

  it('reserva confirmada: nada a enviar (sem foco nem rolagem) e o estado é limpo; aberta sem o pedido, nada muda', async () => {
    await abrirFicha({ ...RESERVA, status: 'CONFIRMED' }, { sendProposal: true });

    await waitFor(() => expect(screen.getByLabelText('Estado da navegação')).toHaveTextContent('null'));
    expect(screen.queryByRole('button', { name: 'Enviar proposta' })).not.toBeInTheDocument();
    expect(rolar).not.toHaveBeenCalled();
    expect(bookingAPI.sendProposal).not.toHaveBeenCalled();
    cleanup();
    bookingAPI.getAuditHistory.mockClear();

    // Aberta da lista de reservas ou por link direto: o foco fica onde estava. Antes de conferir que nada mudou, espera
    // os efeitos do carregamento rodarem (o Histórico da proposta busca no mesmo momento): sem isso, a conferência podia
    // passar antes de o efeito rodar e não pegar um foco indevido.
    await abrirFicha(RESERVA, { outraCoisa: true });
    await waitFor(() => expect(bookingAPI.getAuditHistory).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Enviar proposta' })).not.toHaveFocus();
    expect(rolar).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Estado da navegação')).toHaveTextContent('{"outraCoisa":true}');
  });
});
