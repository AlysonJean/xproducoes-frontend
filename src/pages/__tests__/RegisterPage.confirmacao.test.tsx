import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// N1 (02/11/2026): depois do cadastro, a tela diz "confirme no seu e-mail para entrar" quando o servidor
// avisa que o login vai esperar a confirmação (loginRequiresVerification); senão mantém o texto de antes.
const { register, addNotification } = vi.hoisted(() => ({ register: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../services/api', () => ({ authAPI: { register } }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../components/ui/GoogleAuthButton', () => ({ default: () => null }));

import { RegisterPage } from '../RegisterPage';

const cadastrar = async () => {
  render(<HelmetProvider><MemoryRouter><RegisterPage /></MemoryRouter></HelmetProvider>);
  fireEvent.change(screen.getByLabelText(/Nome completo/), { target: { value: 'Bia Teste' } });
  fireEvent.change(screen.getByLabelText(/E-mail/), { target: { value: 'bia@exemplo.test' } });
  fireEvent.change(screen.getByLabelText(/Telefone/), { target: { value: '31988887777' } });
  fireEvent.change(screen.getByLabelText(/Senha/), { target: { value: 'SenhaForte1' } });
  fireEvent.click(screen.getByRole('button', { name: /Criar conta/ }));
};

describe('RegisterPage — aviso de confirmação do e-mail (N1)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('login espera a confirmação: "Confirme no seu e-mail para entrar"', async () => {
    register.mockResolvedValue({ data: { id: 'u1', loginRequiresVerification: true } });
    await cadastrar();

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success', message: expect.stringContaining('Confirme no seu e-mail para entrar'),
    })));
  });

  it('login não espera: o texto de antes', async () => {
    register.mockResolvedValue({ data: { id: 'u1', loginRequiresVerification: false } });
    await cadastrar();

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success', message: 'Sua conta foi criada com sucesso. Faça login para continuar.',
    })));
  });
});
