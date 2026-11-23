// @vitest-environment-options {"url": "https://telao.exemplo.com/tv"}
// (Fora de localhost de propósito: em localhost/127.0.0.1 o TVPage abre com o mural de teste.)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Onda 2 da auditoria de 19/11: F8-02 (o telão não carregava as fotos já aprovadas, só as que chegavam pelo socket depois
// de aberto) e F8-03 (o rodízio travava com fotos chegando a menos de 8 s, e a foto da tela "pulava" a cada foto nova).
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

const AGORA = new Date('2026-12-10T20:00:00.000Z');
const foto = (id: string) => ({ id, mediaUrl: `https://img.test/${id}.jpg`, author: 'Ana', caption: `Foto ${id}`, status: 'APPROVED' });
let aprovadas: ReturnType<typeof foto>[] = [];

const avancar = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};
const socket = () => sockets[sockets.length - 1];
const chamadasDasFotos = () => apiFetch.mock.calls.filter(([url]) => String(url).startsWith('/public/social/posts')).length;
const naTela = (id: string) => screen.queryByAltText(`Foto ${id}`) !== null;

const abrir = async () => {
  render(
    <MemoryRouter initialEntries={['/tv?slug=formatura-x9a2']}>
      <TVPage />
    </MemoryRouter>,
  );
  await avancar(0);
  act(() => socket().handlers.connect?.());
  await avancar(0);
};

beforeEach(() => {
  vi.useFakeTimers({ now: AGORA });
  sockets.length = 0;
  aprovadas = [foto('p1'), foto('p2')];
  apiFetch.mockReset();
  apiFetch.mockImplementation(async (url: string) => {
    if (url.startsWith('/tv/config')) {
      return {
        linked: true, settingId: 'mural-1', slug: 'formatura-x9a2', eventName: 'Formatura', hashtag: 'formatura',
        enableQrCode: false, enableMosaic: false, enableGamification: false,
        serverNow: AGORA.toISOString(), activeUntil: new Date(AGORA.getTime() + 4 * 60 * 60 * 1000).toISOString(), activeRule: 'eventEnd',
      };
    }
    if (url === '/public/social/posts?settingId=mural-1') return aprovadas;
    throw new Error(`rota inesperada: ${url}`);
  });
  getAnnouncements.mockReset();
  getAnnouncements.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TVPage — fotos já aprovadas (F8-02)', () => {
  it('ao abrir, busca as aprovadas do mural e já mostra a primeira (antes: "Mande sua foto" até chegar uma nova)', async () => {
    await abrir();
    expect(chamadasDasFotos()).toBe(1);
    expect(naTela('p1')).toBe(true);
  });

  it('a cada reconexão do socket busca de novo e acrescenta as que faltam (a primeira conexão não repete a busca)', async () => {
    await abrir();
    expect(chamadasDasFotos()).toBe(1);

    aprovadas = [foto('p3'), ...aprovadas];
    act(() => socket().handlers.connect?.()); // reconectou depois de uma queda
    await avancar(0);
    expect(chamadasDasFotos()).toBe(2);

    // p1 continua na tela; p2 e p3 vêm no rodízio.
    await avancar(8000);
    expect(naTela('p2')).toBe(true);
    await avancar(8000);
    expect(naTela('p3')).toBe(true);
  });
});

describe('TVPage — rodízio (F8-03)', () => {
  it('fotos chegando a cada 3 s não seguram a foto da tela; a nova entra logo depois da atual', async () => {
    await abrir();
    expect(naTela('p1')).toBe(true);

    await avancar(3000);
    act(() => socket().handlers['post:new'](foto('n1')));
    expect(naTela('p1')).toBe(true); // a da tela não muda quando a nova chega

    await avancar(3000);
    act(() => socket().handlers['post:new'](foto('n2')));
    expect(naTela('p1')).toBe(true);

    await avancar(2000); // 8 s desde a primeira foto: o slide troca, mesmo com as chegadas no meio
    expect(naTela('p1')).toBe(false);
    expect(naTela('n2')).toBe(true); // a mais nova entrou logo depois da atual
  });
});
