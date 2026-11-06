import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// N1 (02/11/2026): no erro de login por e-mail não confirmado, a tela oferece "Reenviar confirmação",
// que chama a rota pública POST /auth/resend-verification com o e-mail digitado.
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

const entrar = async (email: string) => {
  render(<MemoryRouter><LoginPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaQualquer1' } });
  fireEvent.click(screen.getByRole('button', { name: /^Entrar$/ }));
};

const recusa = (mensagem: string, code?: string) => Object.assign(new Error(mensagem), code ? { code } : {});

describe('LoginPage — reenviar confirmação (N1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockResolvedValue({ success: true });
  });

  it('e-mail não confirmado: mostra o botão, que reenvia para o e-mail digitado', async () => {
    loginWithCredentials.mockRejectedValue(recusa('E-mail não verificado. Verifique sua caixa de entrada.', 'EMAIL_NOT_VERIFIED'));
    await entrar('Ana@Exemplo.test');

    fireEvent.click(await screen.findByRole('button', { name: 'Reenviar confirmação' }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/auth/resend-verification', expect.objectContaining({ method: 'POST' })));
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({ email: 'ana@exemplo.test' });
    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' })));
  });

  it('senha errada: só o motivo, sem botão de reenviar', async () => {
    loginWithCredentials.mockRejectedValue(recusa('Credenciais inválidas'));
    await entrar('ana@exemplo.test');

    expect(await screen.findByText('Credenciais inválidas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reenviar confirmação' })).not.toBeInTheDocument();
  });
});
