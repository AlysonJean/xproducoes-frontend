// @vitest-environment-options {"url": "https://telao.exemplo.com/tv"}
// (Fora de localhost de propósito: em localhost/127.0.0.1 o TVPage abre com o mural de teste.)
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
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

// D22 (aprovada em 02/11/2026; Q14): TV do mural esquecida ligada. A TV fica visível o tempo todo, e os
// avisos (1 min) e o ranking (5 min) mantinham o Neon grátis acordado 24 h: em cerca de 17 dias a cota do mês
// acabava e a API inteira caía. Agora a TV segue a janela que o servidor manda (fim do evento + 4 h; sem
// reserva, última atividade + 12 h, e abrir a TV conta como atividade), confere uma vez no fim e pausa: para
// avisos e ranking, desliga o socket, mantém as fotos e avisa sem cobrir o QR. Toque, tecla ou aba voltando
// retomam por 2 h. D5: a TV entra só na sala do mural (wall:).

const MIN = 60_000;
const H = 60 * MIN;
const AGORA = new Date('2026-12-10T20:00:00.000Z');
// O relógio do servidor está 3 h à frente do da TV (relógio de TV costuma estar errado): a TV só pode usar
// a diferença activeUntil − serverNow.
const DESVIO = 3 * H;
const PAUSA = 'Mural pausado. Toque na tela ou aperte uma tecla para continuar.';

// "Servidor": activeUntil no relógio da TV (o teste soma o desvio ao responder).
let servidor: { activeUntil: number | null; activeRule: 'eventEnd' | 'lastActivity'; gamification: boolean };
const configDoServidor = () => ({
  linked: true,
  settingId: 'mural-1',
  slug: 'formatura-x9a2',
  eventName: 'Formatura',
  hashtag: 'formatura',
  enableQrCode: true,
  enableMosaic: false,
  enableGamification: servidor.gamification,
  serverNow: new Date(Date.now() + DESVIO).toISOString(),
  activeUntil: servidor.activeUntil === null ? null : new Date(servidor.activeUntil + DESVIO).toISOString(),
  activeRule: servidor.activeRule,
});

const chamadas = (prefixo: string) => apiFetch.mock.calls.filter(([url]) => String(url).startsWith(prefixo)).length;
const consultasDeConfig = () => chamadas('/tv/config');
const buscasDeAvisos = () => getAnnouncements.mock.calls.length;

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

const abrirTV = async () => {
  const view = render(
    <MemoryRouter initialEntries={['/tv?slug=formatura-x9a2']}>
      <TVPage />
    </MemoryRouter>,
  );
  await avancar(0); // configuração e primeira busca de avisos
  act(() => sockets[sockets.length - 1]?.handlers.connect?.());
  return view;
};

const novaFoto = (id: string) =>
  act(() => {
    sockets[sockets.length - 1].handlers['post:new']({ id, mediaUrl: `https://img.test/${id}.jpg`, author: 'Ana', caption: `Foto ${id}`, status: 'APPROVED' });
  });

describe('TVPage — TV esquecida ligada pausa sozinha (D22)', () => {
  beforeAll(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => escondida });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (escondida ? 'hidden' : 'visible') });
  });

  afterAll(() => {
    Reflect.deleteProperty(document, 'hidden');
    Reflect.deleteProperty(document, 'visibilityState');
  });

  beforeEach(() => {
    vi.useFakeTimers({ now: AGORA });
    escondida = false;
    sockets.length = 0;
    servidor = { activeUntil: AGORA.getTime() + H, activeRule: 'eventEnd', gamification: false };
    apiFetch.mockReset();
    apiFetch.mockImplementation(async (url: string) => {
      if (url.startsWith('/tv/config')) return configDoServidor();
      if (url.startsWith('/public/social/leaderboard')) return [{ username: 'Ana', count: 2, avatarUrl: 'https://img.test/a.jpg', platform: 'DIRECT' }];
      throw new Error(`rota inesperada: ${url}`);
    });
    getAnnouncements.mockReset();
    // Como o socialService de verdade (o interceptor do axios tira o envelope { success, data }). Aqui só
    // importa quantas vezes a TV busca.
    getAnnouncements.mockResolvedValue([{ id: 'an-1', title: 'Bolo', message: '22h', isActive: true, frequency: 10, duration: 10 }]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('D5: entra só na sala do mural (wall:<id>), nunca em event:', async () => {
    await abrirTV();
    expect(sockets).toHaveLength(1);
    expect(sockets[0].emit).toHaveBeenCalledWith('join', 'wall:mural-1');
    expect(sockets[0].emit.mock.calls.some(([, room]) => String(room).startsWith('event:'))).toBe(false);
  });

  it('mural com reserva: busca avisos até o fim da janela (pelo relógio do servidor), confere uma vez e pausa', async () => {
    await abrirTV();
    expect(consultasDeConfig()).toBe(1);
    expect(buscasDeAvisos()).toBe(1);

    await avancar(30 * MIN);
    expect(buscasDeAvisos()).toBe(31); // a cada minuto, como antes
    expect(screen.queryByText(PAUSA)).not.toBeInTheDocument();

    await avancar(30 * MIN); // fim da janela: 1 h depois de abrir no relógio da TV (o do servidor está 3 h à frente)
    expect(consultasDeConfig()).toBe(2); // conferiu a configuração uma vez antes de pausar
    expect(screen.getByRole('status')).toHaveTextContent(PAUSA);
    expect(sockets[0].disconnect).toHaveBeenCalled();

    const avisos = buscasDeAvisos();
    await avancar(6 * H);
    expect(buscasDeAvisos()).toBe(avisos); // pausada: nenhuma busca
    expect(consultasDeConfig()).toBe(2);
    // O convite com o QR Code continua na tela.
    expect(screen.getByText('Aponte a câmera')).toBeInTheDocument();
  });

  it('no fim da janela, se o servidor já tem um prazo novo (evento esticado), continua até ele', async () => {
    await abrirTV();
    servidor.activeUntil = AGORA.getTime() + 3 * H; // o admin mudou o fim do evento depois que a TV abriu

    await avancar(H + MIN);
    expect(screen.queryByText(PAUSA)).not.toBeInTheDocument();
    const avisos = buscasDeAvisos();
    await avancar(MIN);
    expect(buscasDeAvisos()).toBe(avisos + 1);

    await avancar(2 * H);
    expect(screen.getByText(PAUSA)).toBeInTheDocument();
  });

  it('pausada, uma tecla do controle retoma por 2 h: configuração, avisos e socket de novo; depois pausa outra vez', async () => {
    await abrirTV();
    await avancar(H + MIN);
    expect(screen.getByText(PAUSA)).toBeInTheDocument();
    const config = consultasDeConfig();
    const avisos = buscasDeAvisos();

    fireEvent.keyDown(window, { key: 'Enter' });
    await avancar(0);
    act(() => sockets[sockets.length - 1].handlers.connect?.());

    expect(screen.queryByText(PAUSA)).not.toBeInTheDocument();
    expect(consultasDeConfig()).toBe(config + 1);
    expect(buscasDeAvisos()).toBe(avisos + 1);
    expect(sockets).toHaveLength(2);
    expect(sockets[1].emit).toHaveBeenCalledWith('join', 'wall:mural-1');

    await avancar(2 * H - 2 * MIN);
    expect(screen.queryByText(PAUSA)).not.toBeInTheDocument();
    expect(buscasDeAvisos()).toBeGreaterThan(avisos + 100);

    await avancar(3 * MIN);
    expect(screen.getByText(PAUSA)).toBeInTheDocument();
    expect(sockets[1].disconnect).toHaveBeenCalled();
  });

  it('mural sem reserva montado dias antes: abrir a TV conta como atividade (12 h), e foto nova empurra a janela', async () => {
    servidor = { activeUntil: AGORA.getTime() - 60 * H, activeRule: 'lastActivity', gamification: false };
    await abrirTV();

    await avancar(11 * H);
    expect(screen.queryByText(PAUSA)).not.toBeInTheDocument();
    novaFoto('p1'); // às 11 h: a janela vai para 23 h
    await avancar(0);

    await avancar(H + MIN); // passou das 12 h desde a abertura
    expect(screen.queryByText(PAUSA)).not.toBeInTheDocument();
    const avisos = buscasDeAvisos();
    await avancar(MIN);
    expect(buscasDeAvisos()).toBe(avisos + 1);

    await avancar(11 * H); // 23 h desde a abertura
    expect(screen.getByText(PAUSA)).toBeInTheDocument();
    // A apresentação continua com a foto que já estava carregada.
    expect(screen.getAllByAltText('Foto p1').length).toBeGreaterThan(0);
  });

  it('mural sem reserva: foto tirada também empurra a janela, e a retomada depois da pausa vale 2 h (não 12 h)', async () => {
    servidor = { activeUntil: AGORA.getTime() - 60 * H, activeRule: 'lastActivity', gamification: false };
    await abrirTV();

    await avancar(11 * H);
    act(() => sockets[sockets.length - 1].handlers['post:remove']({ id: 'p0' })); // às 11 h: a janela vai para 23 h
    await avancar(H + MIN); // passou das 12 h desde a abertura
    expect(screen.queryByText(PAUSA)).not.toBeInTheDocument();

    await avancar(11 * H); // 23 h desde a abertura, e o servidor não tem atividade nova
    expect(screen.getByText(PAUSA)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Enter' });
    await avancar(0);
    expect(screen.queryByText(PAUSA)).not.toBeInTheDocument();
    await avancar(2 * H - 2 * MIN);
    expect(screen.queryByText(PAUSA)).not.toBeInTheDocument();
    await avancar(3 * MIN); // 2 h depois da tecla: pausa de novo (a abertura conta só na primeira configuração)
    expect(screen.getByText(PAUSA)).toBeInTheDocument();
  });

  it('mural sem reserva com atividade recente no servidor: vale o prazo maior do servidor', async () => {
    servidor = { activeUntil: AGORA.getTime() + 20 * H, activeRule: 'lastActivity', gamification: false };
    await abrirTV();

    await avancar(13 * H);
    expect(screen.queryByText(PAUSA)).not.toBeInTheDocument();
    await avancar(7 * H + MIN);
    expect(screen.getByText(PAUSA)).toBeInTheDocument();
  });

  it('mural com reserva: foto nova não estica a janela (a regra é o fim do evento)', async () => {
    await abrirTV();
    await avancar(50 * MIN);
    novaFoto('p1');
    await avancar(11 * MIN);
    expect(screen.getByText(PAUSA)).toBeInTheDocument();
  });

  it('aba escondida não busca avisos (como antes), a janela acaba no horário e a aba voltando retoma', async () => {
    await abrirTV();
    mudarVisibilidade(true);
    await avancar(30 * MIN);
    expect(buscasDeAvisos()).toBe(1);

    await avancar(31 * MIN);
    expect(screen.getByText(PAUSA)).toBeInTheDocument();

    mudarVisibilidade(false);
    await avancar(0);
    expect(screen.queryByText(PAUSA)).not.toBeInTheDocument();
    expect(buscasDeAvisos()).toBe(2);
  });

  it('ranking: chama a rota pública do mural a cada 5 min e para com a TV pausada', async () => {
    servidor.gamification = true;
    await abrirTV();
    expect(apiFetch).toHaveBeenCalledWith('/public/social/leaderboard?settingId=mural-1');
    await avancar(5 * MIN);
    expect(chamadas('/public/social/leaderboard')).toBe(2);

    await avancar(H);
    expect(screen.getByText(PAUSA)).toBeInTheDocument();
    const ranking = chamadas('/public/social/leaderboard');
    await avancar(H);
    expect(chamadas('/public/social/leaderboard')).toBe(ranking);
  });
});
