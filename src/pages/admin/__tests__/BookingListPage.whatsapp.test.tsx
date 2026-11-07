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
  { ...base, id: 'XP-RASCUNHO', status: 'DRAFT', client: null, clientName: 'Dani Rocha', clientContact: null },
  { ...base, id: 'XP-CONFIRMADA', status: 'CONFIRMED', client: null, clientName: 'Eva Reis', clientContact: '31944443333' },
];

const atalho = (id: string) =>
  screen.queryByRole('link', { name: `Enviar proposta da reserva ${id} (abre a página da reserva)` });

// Achado (auditoria ponta a ponta): o botão de WhatsApp da lista só olhava o telefone do cadastro e o
// mandava ao wa.me sem DDI (a regra do contato ficou em utils/bookingContact, com testes próprios).
// D11 (aprovada em 02/11/2026): o botão ainda mandava /proposta/<número da reserva>, uma página que exige login e um
// número que dá para adivinhar. A lista agora só leva à página da reserva, onde fica o "Enviar proposta" (link
// seguro, e-mail pela fila e registro do envio); nada de WhatsApp com /proposta/<número>.
describe('BookingListPage — atalho para "Enviar proposta"', () => {
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
    await screen.findByText(/Mostrando 5 de 5 registros/);
  };

  it.each(['XP-DIGITADO', 'XP-PERFIL-ADMIN', 'XP-SO-EMAIL', 'XP-RASCUNHO'])(
    'rascunho ou pendente (%s): o atalho abre a página da reserva, sem WhatsApp e sem /proposta/<número>',
    async (id) => {
      await renderLista();

      const link = atalho(id);

      expect(link).toHaveAttribute('href', `/admin/reservas/${id}`);
      fireEvent.click(link as HTMLElement);
      expect(open).not.toHaveBeenCalled();
      expect(addNotification).not.toHaveBeenCalled();
      expect(document.body.innerHTML).not.toContain('/proposta/');
    },
  );

  it('reserva confirmada: sem o atalho (a proposta já não se envia)', async () => {
    await renderLista();

    expect(atalho('XP-CONFIRMADA')).toBeNull();
    expect(screen.queryByRole('button', { name: /pelo WhatsApp/ })).toBeNull();
  });
});
