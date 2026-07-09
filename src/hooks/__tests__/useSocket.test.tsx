import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useSocket } from '../useSocket';

const mockOn = vi.fn();
const mockIo = vi.fn((_url: string, _options: Record<string, unknown>) => ({
  on: mockOn,
  emit: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
  connected: false,
  once: vi.fn(),
}));

vi.mock('socket.io-client', () => ({
  io: (url: string, options: Record<string, unknown>) => mockIo(url, options),
}));

function TestComponent() {
  useSocket();
  return null;
}

// Achado (Fase 4): useSocket.ts lia um "token" de secureStorage.get('accessToken') para
// enviar em `auth: { token }` na conexão do socket — mas esse valor sempre foi `null`
// (secureStorage bloqueia deliberadamente qualquer leitura de token, são os cookies
// httpOnly que autenticam de verdade). A autenticação real do socket agora depende só do
// cookie httpOnly (withCredentials: true) — ver backend/src/config/socket.ts.
describe('useSocket - não depende mais de um token de secureStorage (sempre nulo)', () => {
  beforeEach(() => {
    mockIo.mockClear();
    mockOn.mockClear();
  });

  it('conecta sem passar auth.token — a autenticação é só via cookie httpOnly (withCredentials)', async () => {
    render(<TestComponent />);

    await waitFor(() => expect(mockIo).toHaveBeenCalledTimes(1));

    const [, options] = mockIo.mock.calls[0];
    expect(options.withCredentials).toBe(true);
    expect(options).not.toHaveProperty('auth');
  });
});
