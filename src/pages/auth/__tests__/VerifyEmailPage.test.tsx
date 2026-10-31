import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/services/api', () => ({ apiFetch }));

import VerifyEmailPage from '../VerifyEmailPage';

// Todo cadastro pelo site envia um e-mail com link para /verify-email?token=... — a página não
// existia e o link caía na 404. O backend já validava o token em GET /auth/verify-email.
function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verificar-email" element={<VerifyEmailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VerifyEmailPage', () => {
  // Corpo em bloco: se o beforeEach devolve uma função, o Vitest a chama como limpeza ao fim do
  // teste — e mockReset() devolve o próprio mock, que seria chamado (e rejeitaria) de novo.
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it('valida o token do link e confirma o e-mail', async () => {
    apiFetch.mockResolvedValue({ success: true });
    renderAt('/verify-email?token=abc123');

    expect(await screen.findByText(/e-mail confirmado/i)).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/auth/verify-email?token=abc123');
    expect(screen.getByRole('link', { name: /entrar/i })).toHaveAttribute('href', '/login');
  });

  it('token inválido ou expirado: explica e não finge sucesso', async () => {
    apiFetch.mockRejectedValue(new Error('Token inválido ou expirado'));
    renderAt('/verificar-email?token=velho');

    expect(await screen.findByText(/inválido ou expirou/i)).toBeInTheDocument();
    expect(screen.queryByText(/e-mail confirmado/i)).not.toBeInTheDocument();
  });

  it('sem token na URL: avisa sem chamar o servidor', async () => {
    renderAt('/verify-email');
    expect(await screen.findByText(/link de verificação incompleto/i)).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
