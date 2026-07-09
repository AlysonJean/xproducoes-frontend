import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { LGPDPage } from '../LGPDPage';
import { apiFetch } from '../../services/api';
import { useAuth, type AuthContextType } from '../../contexts/AuthContext';

vi.mock('../../services/api', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('../../contexts/AuthContext')>('../../contexts/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <LGPDPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

function makeAuthContext(overrides: Partial<AuthContextType>): AuthContextType {
  return {
    isAuthenticated: true,
    isLoading: false,
    user: { id: 'u1', role: 'CLIENT', name: 'Fulano', email: 'fulano@example.com' },
    logout: vi.fn(),
    refreshToken: vi.fn(),
    isTokenExpired: vi.fn(),
    ...overrides,
  };
}

// Achado (Fase 4): a página de LGPD só orientava "mande um email" — não havia
// autoatendimento real para baixar ou excluir os próprios dados.
describe('LGPDPage - exportação e exclusão reais de dados (não é mais só um texto)', () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
    mockLogout.mockReset();
    vi.mocked(useAuth).mockReturnValue(makeAuthContext({ logout: mockLogout }));

    if (!('createObjectURL' in URL)) {
      Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(), writable: true });
      Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), writable: true });
    } else {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    }
  });

  it('usuário não autenticado vê apenas o texto informativo, sem os botões de autoatendimento', () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthContext({ isAuthenticated: false, user: null, logout: mockLogout }),
    );

    renderPage();

    expect(screen.queryByRole('button', { name: 'Baixar meus dados' })).not.toBeInTheDocument();
  });

  it('"Baixar meus dados" chama o endpoint real de exportação', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ profile: { id: 'u1' }, bookings: [], reviews: [] });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Baixar meus dados' }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/users/me/data-export');
    });
    await waitFor(() => {
      expect(screen.getByText(/baixados com sucesso/i)).toBeInTheDocument();
    });
  });

  it('"Solicitar exclusão" abre a confirmação, e confirmar chama o endpoint real e desloga', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ success: true, message: 'ok' });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Solicitar exclusão da minha conta' }));

    const confirmButton = await screen.findByRole('button', { name: 'Sim, excluir meus dados' });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/users/me/request-deletion', { method: 'POST' });
    });
    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
  });
});
