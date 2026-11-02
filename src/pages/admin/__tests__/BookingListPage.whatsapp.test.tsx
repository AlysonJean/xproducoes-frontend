import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch, useAuth, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn(), addNotification: vi.fn() }));
vi.mock('xlsx-js-style', () => ({ default: {} }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));

import BookingListPage from '../BookingListPage';

const base = { status: 'PENDING', totalPrice: '300', eventDate: '2027-01-10T21:00:00.000Z' };
const conta = (id: string, phone: string) => ({ id, phone, user: { id: `u-${id}`, name: 'Dono da Empresa', email: 'dono@empresa.test' } });

// Como GET /admin/bookings devolve: cliente digitado (sem cadastro) tem client nulo e o contato na
// reserva; a reserva que a Proposta Rápida pendurou no cadastro do admin tem o telefone de OUTRO cliente
// no cadastro; o orçamento do site sem telefone tem o e-mail no contato.
const reservas = [
  { ...base, id: 'XP-DIGITADO', client: null, clientName: 'Ana Souza', clientContact: '(31) 98888-7777' },
  { ...base, id: 'XP-PERFIL-ADMIN', client: conta('c1', '31911112222'), clientName: 'Bruno Lima', clientContact: '31977776666' },
  { ...base, id: 'XP-SO-EMAIL', client: conta('c2', '31955554444'), clientName: 'Carla Dias', clientContact: 'carla@cliente.test' },
  { ...base, id: 'XP-SEM-TELEFONE', client: null, clientName: 'Dani Rocha', clientContact: null },
];

const abrirWhatsApp = (id: string) =>
  fireEvent.click(screen.getByRole('button', { name: `Enviar proposta da reserva ${id} pelo WhatsApp` }));

// Achado (auditoria ponta a ponta): o botão de WhatsApp da lista só olhava o telefone do cadastro e o
// mandava ao wa.me sem DDI. Proposta de cliente digitado abria o WhatsApp sem destinatário; número
// digitado como "(31) 9..." ia para a Holanda (DDI 31); a reserva pendurada no cadastro do admin ia
// para o telefone de outro cliente.
describe('BookingListPage — WhatsApp da proposta', () => {
  let open: MockInstance<typeof window.open>;

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    apiFetch.mockImplementation((url: string) => Promise.resolve(url.startsWith('/admin/bookings?page=1') ? reservas : []));
    open = vi.spyOn(window, 'open').mockReturnValue(null);
  });

  afterEach(() => {
    open.mockRestore();
  });

  const renderLista = async () => {
    render(<MemoryRouter initialEntries={['/admin/reservas']}><BookingListPage /></MemoryRouter>);
    await screen.findByText(/Mostrando 4 de 4 registros/);
  };

  it.each([
    ['cliente digitado (sem cadastro): o contato da reserva', 'XP-DIGITADO', '5531988887777'],
    ['reserva no cadastro de outra pessoa: o contato da reserva vem antes', 'XP-PERFIL-ADMIN', '5531977776666'],
    ['contato que é e-mail: o telefone do cadastro', 'XP-SO-EMAIL', '5531955554444'],
  ])('%s, com DDI', async (_caso, id, numero) => {
    await renderLista();

    abrirWhatsApp(id);

    expect(open).toHaveBeenCalledTimes(1);
    const url = new URL(String(open.mock.calls[0][0]));
    expect(`${url.origin}${url.pathname}`).toBe(`https://wa.me/${numero}`);
    expect(url.searchParams.get('text')).toContain(`/proposta/${id}`);
  });

  it('sem telefone: avisa e não abre o WhatsApp sem destinatário', async () => {
    await renderLista();

    abrirWhatsApp('XP-SEM-TELEFONE');

    expect(open).not.toHaveBeenCalled();
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', title: 'Sem telefone' }));
  });
});
