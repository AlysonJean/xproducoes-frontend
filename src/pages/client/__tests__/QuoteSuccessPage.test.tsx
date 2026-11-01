import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Navigate, useLocation, useParams } from 'react-router-dom';

const { apiFetch, openWhatsApp, authState } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  openWhatsApp: vi.fn(),
  authState: { user: null as null | { id: string }, isLoading: false },
}));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../utils/whatsapp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/whatsapp')>()),
  openWhatsApp,
}));

import { QuoteSuccessPage } from '../QuoteSuccessPage';

// Mesmo redirecionamento de App.tsx para a rota antiga.
const LegacyRedirect = () => {
  const { id } = useParams();
  const location = useLocation();
  return <Navigate to={id ? `/orcamento-sucesso/${id}` : '/orcamento-sucesso'} replace state={location.state} />;
};

const renderAt = (entry: string | { pathname: string; state: unknown }) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/orcamento-sucesso" element={<QuoteSuccessPage />} />
        <Route path="/orcamento-sucesso/:bookingId" element={<QuoteSuccessPage />} />
        <Route path="/reserva-sucesso/:id" element={<LegacyRedirect />} />
      </Routes>
    </MemoryRouter>,
  );

const FORM_STATE = {
  booking: { id: 'XP-ANA-20261120-1900-H04', eventDate: '2026-11-20T22:00:00.000Z', eventDuration: 4 },
  formData: { name: 'Ana', phone: '31999990000', venue: 'Salão Azul', city: 'Belo Horizonte' },
  cartItems: [{ name: 'Kit: Festa' }],
};

// Achado: o pedido de orçamento caía em /reserva-sucesso ("Reserva realizada com sucesso!", com o
// pedido ainda pendente) e /orcamento-sucesso não recebia o id nem tinha quem navegasse até ela.
describe('QuoteSuccessPage', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    openWhatsApp.mockReset();
    authState.user = null;
  });

  it('logo após o envio abre o WhatsApp uma vez com o pedido e diz que ainda não está confirmado', async () => {
    renderAt({ pathname: '/orcamento-sucesso/XP-ANA-20261120-1900-H04', state: FORM_STATE });

    expect(await screen.findByText('Pedido de orçamento enviado!')).toBeInTheDocument();
    expect(screen.getByText(/só fica confirmada depois/)).toBeInTheDocument();
    expect(screen.getByText('XP-ANA-20261120-1900-H04')).toBeInTheDocument();
    await waitFor(() => expect(openWhatsApp).toHaveBeenCalledTimes(1));
    const message = openWhatsApp.mock.calls[0][1] as string;
    expect(message).toContain('XP-ANA-20261120-1900-H04');
    expect(message).toContain('Kit: Festa');
    expect(screen.getByRole('status')).toHaveTextContent(/Abrimos o WhatsApp/);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('a rota antiga /reserva-sucesso/:id cai na tela nova levando o state', async () => {
    renderAt({ pathname: '/reserva-sucesso/XP-ANA-20261120-1900-H04', state: FORM_STATE });

    expect(await screen.findByText('Pedido de orçamento enviado!')).toBeInTheDocument();
    expect(screen.queryByText(/Reserva realizada/)).not.toBeInTheDocument();
    await waitFor(() => expect(openWhatsApp).toHaveBeenCalledTimes(1));
  });

  it('sem state e sem sessão não consulta a API; o botão manda ao menos o número do pedido', async () => {
    renderAt('/orcamento-sucesso/XP-1');

    fireEvent.click(await screen.findByRole('button', { name: /Abrir WhatsApp/ }));
    expect(apiFetch).not.toHaveBeenCalled();
    expect(openWhatsApp.mock.calls[0][1]).toContain('XP-1');
    expect(screen.getByRole('link', { name: 'Entrar para acompanhar' })).toHaveAttribute('href', '/login');
  });

  it('sem state e com sessão busca a reserva e não abre o WhatsApp sozinho', async () => {
    authState.user = { id: 'u1' };
    apiFetch.mockResolvedValue({ id: 'XP-2', eventDate: '2026-12-01T20:00:00.000Z', kit: { name: 'Kit Som' } });
    renderAt('/orcamento-sucesso/XP-2');

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/bookings/XP-2'));
    expect(openWhatsApp).not.toHaveBeenCalled();
    const button = await screen.findByRole('button', { name: /Abrir WhatsApp/ });
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    expect(openWhatsApp.mock.calls[0][1]).toContain('Kit Som');
    expect(screen.getByRole('link', { name: 'Ver meus pedidos' })).toHaveAttribute('href', '/minhas-reservas');
  });
});
