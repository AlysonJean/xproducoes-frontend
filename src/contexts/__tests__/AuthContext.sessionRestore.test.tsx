import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { authAPI } = vi.hoisted(() => ({ authAPI: { getProfile: vi.fn(), logout: vi.fn() } }));
vi.mock('../../services/api', () => ({ authAPI }));

import { AuthProvider, useAuth } from '../AuthContext';

// Checagem de sessão ao abrir cada página: sem o cookie-sinal x_session e já tentado nesta aba,
// não há sessão para restaurar — antes, todo visitante sem login fazia GET /auth/profile (401)
// em cada página, mais o refresh (400) que o 401 disparava.
function Probe() {
  const { isLoading, user } = useAuth();
  return <p>{isLoading ? 'carregando' : user ? `logado: ${user.name}` : 'deslogado'}</p>;
}

function clearCookies() {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
}

describe('AuthContext — checagem de sessão ao carregar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCookies();
    sessionStorage.clear();
    authAPI.getProfile.mockResolvedValue({ data: { id: 'u1', name: 'Cliente', email: 'c@t.com', role: 'CLIENT' } });
  });

  it('sem sinal e já tentado nesta aba: não consulta o perfil', async () => {
    sessionStorage.setItem('xp_session_restore_tried', '1');
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText('deslogado')).toBeInTheDocument();
    expect(authAPI.getProfile).not.toHaveBeenCalled();
  });

  it('com sinal: consulta o perfil e restaura a sessão', async () => {
    sessionStorage.setItem('xp_session_restore_tried', '1');
    document.cookie = 'x_session=1; path=/';
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText('logado: Cliente')).toBeInTheDocument();
  });

  it('sem sinal, primeira vez na aba: ainda consulta (sessão aberta antes do sinal existir)', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText('logado: Cliente')).toBeInTheDocument();
    expect(authAPI.getProfile).toHaveBeenCalledTimes(1);
  });
});
