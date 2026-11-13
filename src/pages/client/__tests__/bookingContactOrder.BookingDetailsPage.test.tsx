import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'CLIENT' } }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../components/client/BookingChatPanel', () => ({ BookingChatPanel: () => null }));

import { BookingDetailsPage } from '../BookingDetailsPage';

// Como GET /bookings/:id devolve ao cliente: o cadastro (client) traz o telefone do perfil e a conta
// (client.user) traz o e-mail; o contato informado nesta reserva vem nela mesma.
const RESERVA = {
  id: 'XP-ANA-1',
  status: 'CONFIRMED',
  eventDate: '2027-01-10T21:00:00.000Z',
  totalPrice: '300',
  attachments: [],
  eventCollaborators: [],
  client: { id: 'cli-1', phone: '31911112222', companyName: null, user: { id: 'u1', name: 'Ana Souza', email: 'ana@conta.test', avatarUrl: null } },
  clientName: 'Ana Souza',
  clientContact: '(31) 98888-7777',
  clientEmail: null,
};

const renderPage = async (reserva: object) => {
  apiFetch.mockResolvedValue(reserva);
  render(
    <MemoryRouter initialEntries={['/cliente/reservas/XP-ANA-1']}>
      <Routes>
        <Route path="/cliente/reservas/:id" element={<BookingDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText('Informações do Cliente');
};

const campo = (rotulo: string) => screen.getByText(rotulo, { selector: 'dt' }).nextElementSibling?.textContent;

// Achado (auditoria ponta a ponta): o cartão "Informações do Cliente" mostrava só o telefone do
// cadastro (o PDF baixado na mesma tela passou a usar o contato da reserva) e lia o e-mail de
// client.email, que a API não manda: saía sempre "Não informado".
describe('BookingDetailsPage (cliente) — contato do cartão "Informações do Cliente"', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it('mostra o telefone informado na reserva e o e-mail da conta', async () => {
    await renderPage(RESERVA);

    expect(campo('Nome')).toBe('Ana Souza');
    expect(campo('Telefone')).toBe('(31) 98888-7777');
    expect(campo('E-mail')).toBe('ana@conta.test');
    expect(screen.queryByText('31911112222')).not.toBeInTheDocument();
  });

  it('contato que é e-mail: telefone do cadastro; e-mail informado na reserva antes do da conta', async () => {
    await renderPage({ ...RESERVA, clientContact: 'ana@pedido.test', clientEmail: 'ana@pedido.test' });

    expect(campo('Telefone')).toBe('31911112222');
    expect(campo('E-mail')).toBe('ana@pedido.test');
  });

  it('nome: o da conta; sem conta, o informado na reserva', async () => {
    await renderPage({ ...RESERVA, client: null, clientName: 'Bruno Lima' });

    expect(campo('Nome')).toBe('Bruno Lima');
  });
});
