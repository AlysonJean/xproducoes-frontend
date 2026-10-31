import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { authAPI, authService } = vi.hoisted(() => ({
  authAPI: { getProfile: vi.fn(), logout: vi.fn() },
  authService: { logout: vi.fn(), refreshToken: vi.fn() },
}));
vi.mock('../../services/api', () => ({ authAPI }));
vi.mock('../../services/authservice', () => ({ authService }));

import { AuthProvider, useAuth } from '../AuthContext';

// "Sair" não saía: o logout só limpava o estado e recarregava em /login. Os cookies de
// sessão são httpOnly (só o servidor apaga) e continuavam válidos — a página recarregada
// buscava o perfil de novo e a pessoa voltava logada.
function Consumer() {
  const { user, logout } = useAuth();
  return (
    <div>
      <p>{user ? `logado: ${user.name}` : 'deslogado'}</p>
      <button onClick={() => void logout()}>Sair</button>
    </div>
  );
}

function deferred() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('AuthContext.logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authAPI.getProfile.mockResolvedValue({ data: { id: 'u1', name: 'Cliente', email: 'c@t.com', role: 'CLIENT' } });
  });

  it('pede ao servidor para encerrar a sessão (apagar os cookies) ANTES de redirecionar', async () => {
    const call = deferred();
    authAPI.logout.mockReturnValue(call.promise);
    render(<AuthProvider><Consumer /></AuthProvider>);
    expect(await screen.findByText('logado: Cliente')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(authAPI.logout).toHaveBeenCalledTimes(1);
    expect(authService.logout).not.toHaveBeenCalled(); // ainda esperando o servidor
    call.resolve();
    await vi.waitFor(() => expect(authService.logout).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('deslogado')).toBeInTheDocument();
  });

  it('se o servidor falhar, sai localmente mesmo assim', async () => {
    authAPI.logout.mockRejectedValue(new Error('Network Error'));
    render(<AuthProvider><Consumer /></AuthProvider>);
    expect(await screen.findByText('logado: Cliente')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));

    await vi.waitFor(() => expect(authService.logout).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('deslogado')).toBeInTheDocument();
  });
});
