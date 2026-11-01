import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const apiFetch = vi.fn();
const addNotification = vi.fn();
vi.mock('@/services/api', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));

import ResetPasswordPage from '../ResetPasswordPage';

// Recuperação de senha nunca funcionou: a página mandava `password`, mas a API valida
// `newPassword` (400), e aceitava senhas que a API recusa (8+ com maiúscula, minúscula e
// número) — o erro voltava genérico, sem dizer qual regra faltou.
function renderPage() {
  render(
    <MemoryRouter initialEntries={['/redefinir-senha?token=tok123']}>
      <Routes>
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
        <Route path="/login" element={<p>tela de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function submit(password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Nova Senha'), password);
  await user.type(screen.getByLabelText('Confirmar Senha'), password);
  await user.click(screen.getByRole('button', { name: /redefinir senha/i }));
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    apiFetch.mockReset().mockResolvedValue({ success: true });
    addNotification.mockReset();
  });

  it('envia token + newPassword (o campo que a API valida) e vai para o login', async () => {
    renderPage();
    await submit('NovaSenha123');

    expect(apiFetch).toHaveBeenCalledTimes(1);
    const [path, options] = apiFetch.mock.calls[0];
    expect(path).toBe('/auth/reset-password');
    expect(JSON.parse(options.body)).toEqual({ token: 'tok123', newPassword: 'NovaSenha123' });
    expect(await screen.findByText('tela de login')).toBeInTheDocument();
  });

  it('recusa na tela a senha que a API recusaria, dizendo a regra', async () => {
    renderPage();
    await submit('abcdefgh');

    expect(apiFetch).not.toHaveBeenCalled();
    // A dica da regra agora aparece sempre abaixo do campo (AuthLayout/PASSWORD_HINT) — o teste
    // confere a MENSAGEM DE ERRO exata, não qualquer texto com "maiúscula".
    expect(await screen.findByText('A senha deve conter pelo menos uma letra maiúscula')).toBeInTheDocument();
  });
});
