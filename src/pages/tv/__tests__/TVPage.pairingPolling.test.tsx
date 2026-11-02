// @vitest-environment-options {"url": "https://telao.exemplo.com/tv"}
// (Fora de localhost de propósito: em localhost/127.0.0.1 o TVPage já abre com o mural de teste e
// não passa pela tela de pareamento.)
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../services/socialService', () => ({
  socialService: { getAnnouncements: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock('socket.io-client', () => ({
  io: () => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn() }),
}));

import TVPage from '../TVPage';

// Achado (auditoria ponta a ponta): a tela de pareamento consultava /tv/config (que lê o banco) a
// cada 5 s sem prazo — e a TV fica ligada e visível, então uma TV esquecida nessa tela mantinha o
// Neon (plano free) acordado 24 h e gastava a cota mensal. Agora a busca para depois de 15 min e
// retoma, com o mesmo código, com um toque, uma tecla do controle ou a aba voltando a ficar visível.

const CODIGO = '4821';
const MURAL = { linked: true, settingId: 'mural-1', eventName: 'Casamento Ana & Leo', hashtag: 'analeo' };
const JANELA_MS = 15 * 60_000;

// Como o backend: /tv/config?pairingCode=X só responde linked:true depois que o admin pareia esse
// código exato (POST /tv/pair); antes disso, { linked: false }.
let pareados: Set<string>;
const configDoBackend = async (url: string) => {
  const code = new URLSearchParams(url.split('?')[1] ?? '').get('pairingCode');
  return code && pareados.has(code) ? MURAL : { linked: false };
};
const consultasDeConfig = () => apiFetch.mock.calls.filter(([url]) => String(url).startsWith('/tv/config')).length;

let escondida = false;
const mudarVisibilidade = (hidden: boolean) => {
  escondida = hidden;
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
};

const avancar = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

const renderTV = async () => {
  const view = render(
    <MemoryRouter initialEntries={[`/tv?code=${CODIGO}`]}>
      <TVPage />
    </MemoryRouter>,
  );
  await avancar(0); // primeira consulta
  return view;
};

describe('TVPage — consulta da tela de pareamento', () => {
  beforeAll(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => escondida });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (escondida ? 'hidden' : 'visible'),
    });
  });

  afterAll(() => {
    // Volta aos getters do próprio jsdom (Document.prototype).
    Reflect.deleteProperty(document, 'hidden');
    Reflect.deleteProperty(document, 'visibilityState');
  });

  beforeEach(() => {
    vi.useFakeTimers();
    escondida = false;
    pareados = new Set();
    apiFetch.mockReset();
    apiFetch.mockImplementation(configDoBackend);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('consulta a cada 5 s durante a janela e depois para (antes: a cada 5 s para sempre)', async () => {
    await renderTV();
    expect(apiFetch).toHaveBeenLastCalledWith(`/tv/config?pairingCode=${CODIGO}`);
    expect(consultasDeConfig()).toBe(1);

    await avancar(60_000);
    expect(consultasDeConfig()).toBe(13);

    await avancar(JANELA_MS);
    const ateAPausa = consultasDeConfig();
    await avancar(60 * 60_000);

    expect(consultasDeConfig()).toBe(ateAPausa);
    expect(screen.getByText(CODIGO)).toBeInTheDocument();
    expect(screen.getByText(/Pareamento pausado/)).toBeInTheDocument();
  });

  it('pausada, uma tecla do controle retoma com o mesmo código e o pareamento feito depois entra', async () => {
    await renderTV();
    await avancar(JANELA_MS + 60_000);
    expect(screen.getByText(/Pareamento pausado/)).toBeInTheDocument();

    pareados.add(CODIGO); // o admin pareou depois da pausa
    apiFetch.mockClear();
    fireEvent.keyDown(window, { key: 'Enter' });
    await avancar(0);

    expect(apiFetch).toHaveBeenCalledWith(`/tv/config?pairingCode=${CODIGO}`);
    expect(screen.getByText(MURAL.eventName)).toBeInTheDocument();
  });

  it('pausada, o botão "Continuar pareamento" retoma a busca', async () => {
    await renderTV();
    await avancar(JANELA_MS + 60_000);
    apiFetch.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar pareamento' }));
    await avancar(0);

    expect(consultasDeConfig()).toBe(1);
    expect(screen.queryByText(/Pareamento pausado/)).not.toBeInTheDocument();
  });

  it('aba escondida não consulta; pausada, a aba voltando a ficar visível retoma a busca', async () => {
    await renderTV();
    apiFetch.mockClear();
    mudarVisibilidade(true);
    await avancar(JANELA_MS + 60_000);
    expect(consultasDeConfig()).toBe(0);

    mudarVisibilidade(false);
    await avancar(0);

    expect(consultasDeConfig()).toBe(1);
  });

  it('pareada dentro da janela: mostra o mural e para de consultar /tv/config', async () => {
    await renderTV();
    await avancar(30_000);
    pareados.add(CODIGO);

    await avancar(5_000);
    expect(screen.getByText(MURAL.eventName)).toBeInTheDocument();

    const consultas = consultasDeConfig();
    await avancar(JANELA_MS);
    expect(consultasDeConfig()).toBe(consultas);
  });
});
