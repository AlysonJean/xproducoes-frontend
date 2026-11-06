// @vitest-environment-options {"url": "https://telao.exemplo.com/tv"}
// (Fora de localhost de propósito: em localhost/127.0.0.1 o TVPage abre com o mural de teste.)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

type FakeSocket = {
  handlers: Record<string, (...args: unknown[]) => void>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  emit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};

const { apiFetch, getAnnouncements, sockets } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  getAnnouncements: vi.fn(),
  sockets: [] as FakeSocket[],
}));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../services/socialService', () => ({ socialService: { getAnnouncements } }));
vi.mock('socket.io-client', () => ({
  io: () => {
    const socket: FakeSocket = {
      handlers: {},
      on: (event, handler) => {
        socket.handlers[event] = handler;
      },
      emit: vi.fn(),
      disconnect: vi.fn(),
    };
    sockets.push(socket);
    return socket;
  },
}));

import TVPage from '../TVPage';

// Achado (lote 12): desde adcea6a (31/03/2026) o interceptor do axios tira o envelope { success, data }, e o
// socialService.getAnnouncements devolve a lista direto. A TV fazia `response.data.filter(...)`: lançava, o
// erro ia para o log e os avisos do mural (ex.: "Bolo às 22h") nunca apareciam no telão.
const AGORA = new Date('2026-12-10T20:00:00.000Z');

const avancar = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

beforeEach(() => {
  vi.useFakeTimers({ now: AGORA });
  sockets.length = 0;
  apiFetch.mockReset();
  apiFetch.mockImplementation(async (url: string) => {
    if (url.startsWith('/tv/config')) {
      return {
        linked: true,
        settingId: 'mural-1',
        slug: 'formatura-x9a2',
        eventName: 'Formatura',
        hashtag: 'formatura',
        enableQrCode: true,
        enableMosaic: false,
        enableGamification: false,
        serverNow: AGORA.toISOString(),
        activeUntil: new Date(AGORA.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        activeRule: 'eventEnd',
      };
    }
    throw new Error(`rota inesperada: ${url}`);
  });
  getAnnouncements.mockReset();
  // Como o socialService de verdade em produção: a lista, já sem o envelope.
  // O desligado vem primeiro: sem o filtro de ativos, seria ele o aviso mostrado.
  getAnnouncements.mockResolvedValue([
    { id: 'an-2', title: 'Desligado', message: 'Aviso desligado', isActive: false, frequency: 1, duration: 10 },
    { id: 'an-1', title: 'Bolo', message: 'Corte do bolo às 22h', isActive: true, frequency: 1, duration: 10 },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TVPage — avisos do mural com a resposta já sem o envelope', () => {
  it('mostra o aviso ativo entre as fotos (e nunca o desligado)', async () => {
    render(
      <MemoryRouter initialEntries={['/tv?slug=formatura-x9a2']}>
        <TVPage />
      </MemoryRouter>,
    );
    await avancar(0);
    act(() => sockets[sockets.length - 1].handlers.connect?.());
    act(() => {
      sockets[sockets.length - 1].handlers['post:new']({ id: 'p1', mediaUrl: 'https://img.test/p1.jpg', author: 'Ana', caption: 'Foto p1', status: 'APPROVED' });
    });
    expect(getAnnouncements).toHaveBeenCalledWith('mural-1');

    await avancar(8000); // fim do primeiro slide de foto: o aviso (frequência 1) entra
    expect(screen.getByText('Corte do bolo às 22h')).toBeInTheDocument();
    expect(screen.queryByText('Aviso desligado')).not.toBeInTheDocument();
  });
});
