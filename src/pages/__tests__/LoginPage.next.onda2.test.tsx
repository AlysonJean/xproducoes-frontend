import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Onda 2 da auditoria de 19/11 (F1-06): a própria tela de login leva ao destino pedido (?next=), não ao painel que o
// servidor sugere. Aqui a LoginPage sozinha (sem o AuthRedirect, que também leva ao destino).
const { loginWithCredentials, apiFetch, addNotification } = vi.hoisted(() => ({
  loginWithCredentials: vi.fn(),
  apiFetch: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ loginWithCredentials }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ loginWithCredentials }) }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('../../components/ui/GoogleAuthButton', () => ({ default: () => null }));

import { LoginPage } from '../LoginPage';

const entrarEm = (inicio: string) => {
  render(
    <MemoryRouter initialEntries={[inicio]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/reservas/:id" element={<p>Reserva no painel</p>} />
        <Route path="/admin/painel" element={<p>Painel</p>} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'dona@x.test' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaCerta1' } });
  fireEvent.click(screen.getByRole('button', { name: /^Entrar$/ }));
};

describe('LoginPage — destino depois de entrar (F1-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loginWithCredentials.mockResolvedValue('/admin/painel');
  });

  it('com ?next= interno: vai para a página pedida', async () => {
    entrarEm('/login?next=%2Fadmin%2Freservas%2FXP-1');
    expect(await screen.findByText('Reserva no painel')).toBeInTheDocument();
  });

  it('com ?next= para outro site: ignora e vai ao painel', async () => {
    entrarEm('/login?next=https%3A%2F%2Fmal.test');
    expect(await screen.findByText('Painel')).toBeInTheDocument();
  });
});
