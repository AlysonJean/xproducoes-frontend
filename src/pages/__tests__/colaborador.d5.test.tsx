import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';

// D5 (aprovada em 02/11/2026): em produção o Roteiro não tem tempo real (nenhuma conexão chega com login,
// porque o cookie do site não vai para o endereço do servidor) e o servidor não deixa mais conexão sem login
// entrar na sala do evento. O Roteiro recarrega as tarefas em silêncio a cada 60 s com a aba visível e na hora
// em que a aba volta; para 4 h depois do fim do evento (um Roteiro esquecido aberto não mantém o banco
// acordado) e só volta com uma nova interação, por 2 h. O selo "Tempo real ativo" só aparece com a sala do
// evento confirmada pelo servidor.
type Handler = (...args: unknown[]) => void;
const { getEventRoadmap, getEventTasks, socket } = vi.hoisted(() => {
  const handlers: Record<string, Handler[]> = {};
  return {
    getEventRoadmap: vi.fn(),
    getEventTasks: vi.fn(),
    // Como o useSocket de verdade: funções estáveis; `on` devolve a limpeza.
    socket: {
      handlers,
      isConnected: false,
      on: (event: string, handler: Handler) => {
        (handlers[event] ??= []).push(handler);
        return () => {
          handlers[event] = (handlers[event] ?? []).filter((h) => h !== handler);
        };
      },
      emit: () => undefined,
    },
  };
});
vi.mock('../../services/api', () => ({
  collaboratorProfileAPI: { getEventRoadmap, getEventTasks, toggleTask: vi.fn(), addExpense: vi.fn(), sendUrgentAlert: vi.fn() },
  collaboratorMessagesAPI: { sendMessage: vi.fn() },
  uploadAPI: { uploadFile: vi.fn() },
}));
vi.mock('../../hooks/useSocket', () => ({
  useSocket: () => ({ on: socket.on, emit: socket.emit, isConnected: socket.isConnected }),
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-eu', name: 'Bruno Técnico', role: 'COLLABORATOR' } }),
}));
vi.mock('../../components/collaborator/CollaboratorLayout', () => ({
  CollaboratorLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
// Sem animação: com o relógio falso, a troca de aba (AnimatePresence mode="wait") dependeria do relógio global
// do framer-motion, que guarda o tempo do caso anterior.
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const semAnimacao = (tag: string) =>
    React.forwardRef<HTMLElement, Record<string, unknown>>(({ initial: _i, animate: _a, exit: _e, transition: _t, ...props }, ref) =>
      React.createElement(tag, { ...props, ref }),
    );
  return {
    AnimatePresence: ({ children }: { children: ReactNode }) => React.createElement(React.Fragment, null, children),
    motion: { div: semAnimacao('div'), form: semAnimacao('form') },
  };
});

import CollaboratorEventRoadmapPage from '../collaborator/CollaboratorEventRoadmapPage';

const MIN = 60_000;
const H = 60 * MIN;
const AGORA = new Date('2026-12-10T22:00:00.000Z');
const FIM_DO_EVENTO = new Date(AGORA.getTime() + H); // o evento acaba daqui a 1 h

const tarefa = (id: string, title: string, isCompleted = false) => ({ id, title, description: null, isCompleted, completedAt: null });
const roteiro = () => ({
  id: 'XP-ANA-20261210-2230-K4Q',
  status: 'CONFIRMED',
  eventTitle: 'Casamento Silva',
  eventDate: new Date(AGORA.getTime() - 3 * H).toISOString(),
  eventEndDate: FIM_DO_EVENTO.toISOString(),
  city: 'Belo Horizonte',
  tasks: [tarefa('t1', 'Montar o som')],
  expenses: [],
  eventCollaborators: [],
  chats: [{ id: 'chat-1', name: null, type: 'EVENT', updatedAt: AGORA.toISOString() }],
});

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
const abrirRoteiro = async () => {
  const view = render(
    <MemoryRouter initialEntries={['/colaborador/eventos/XP-ANA-20261210-2230-K4Q']}>
      <Routes>
        <Route path="/colaborador/eventos/:id" element={<CollaboratorEventRoadmapPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await avancar(0);
  return view;
};
const recargas = () => getEventTasks.mock.calls.length;
const abrirAba = async (nome: RegExp) => {
  fireEvent.click(screen.getByRole('tab', { name: nome }));
  await avancar(0);
};

describe('Roteiro — tarefas sem tempo real (D5)', () => {
  beforeAll(() => {
    // O jsdom não rola a tela: a aba do chat rola até a última mensagem ao abrir.
    Element.prototype.scrollIntoView = vi.fn();
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
    socket.isConnected = false;
    for (const key of Object.keys(socket.handlers)) delete socket.handlers[key];
    getEventRoadmap.mockReset();
    getEventRoadmap.mockResolvedValue({ data: roteiro() });
    getEventTasks.mockReset();
    getEventTasks.mockResolvedValue({ data: [tarefa('t1', 'Montar o som', true), tarefa('t2', 'Conferir o gerador')] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('a cada 60 s com a aba visível busca só as tarefas, sem a tela de carregamento, e a lista se atualiza', async () => {
    await abrirRoteiro();
    expect(getEventRoadmap).toHaveBeenCalledTimes(1);
    expect(recargas()).toBe(0);

    await avancar(59_000);
    expect(recargas()).toBe(0);
    await avancar(1_000);
    expect(getEventTasks).toHaveBeenCalledWith('XP-ANA-20261210-2230-K4Q');
    expect(recargas()).toBe(1);
    await avancar(2 * MIN);
    expect(recargas()).toBe(3);

    // Sem recarregar o Roteiro inteiro e sem a tela de carregamento.
    expect(getEventRoadmap).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Carregando dados do evento…')).not.toBeInTheDocument();
    await abrirAba(/Tarefas/);
    expect(screen.getByText('Conferir o gerador')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Montar o som/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('com a aba escondida não busca; ao voltar para a aba, busca na hora', async () => {
    await abrirRoteiro();
    mudarVisibilidade(true);
    await avancar(5 * MIN);
    expect(recargas()).toBe(0);

    mudarVisibilidade(false);
    await avancar(0);
    expect(recargas()).toBe(1);
  });

  it('para 4 h depois do fim do evento; uma nova interação volta a buscar por 2 h', async () => {
    await abrirRoteiro();
    await avancar(H + 4 * H); // fim do evento + 4 h
    const ateOPrazo = recargas();
    expect(ateOPrazo).toBeGreaterThanOrEqual(299);

    await avancar(10 * H);
    expect(recargas()).toBe(ateOPrazo); // Roteiro esquecido aberto: nenhuma busca

    fireEvent.keyDown(window, { key: 'Tab' });
    await avancar(0);
    expect(recargas()).toBe(ateOPrazo + 1);
    await avancar(2 * H);
    const fimDaRetomada = recargas();
    expect(fimDaRetomada).toBeGreaterThanOrEqual(ateOPrazo + 120);
    await avancar(H);
    expect(recargas()).toBe(fimDaRetomada);
  });

  it('Roteiro de evento que já acabou há mais de 4 h: não busca sozinho', async () => {
    getEventRoadmap.mockResolvedValue({ data: { ...roteiro(), eventEndDate: new Date(AGORA.getTime() - 5 * H).toISOString() } });
    await abrirRoteiro();
    await avancar(10 * MIN);
    expect(recargas()).toBe(0);
  });

  it('selo do chat: conexão aberta sem a sala confirmada não é "Tempo real ativo"; com room_joined do evento, é', async () => {
    socket.isConnected = true; // em produção a conexão abre, sem login
    await abrirRoteiro();
    await abrirAba(/Chat/);
    expect(screen.getByText('Sem conexão em tempo real')).toBeInTheDocument();
    expect(screen.queryByText('Tempo real ativo')).not.toBeInTheDocument();

    act(() => socket.handlers.room_joined?.forEach((h) => h('event:outra-reserva')));
    expect(screen.queryByText('Tempo real ativo')).not.toBeInTheDocument();

    act(() => socket.handlers.room_joined?.forEach((h) => h('event:XP-ANA-20261210-2230-K4Q')));
    expect(screen.getByText('Tempo real ativo')).toBeInTheDocument();

    act(() => socket.handlers.disconnect?.forEach((h) => h()));
    expect(screen.getByText('Sem conexão em tempo real')).toBeInTheDocument();
  });
});
