import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';

// Onda 3 da auditoria de 19/11, lote 3c, no site: Notificações fora do menu (F9-11), dados para pagamento no painel
// (F9-13), recarga do Roteiro só perto do evento (F9-14), Mensagens anteriores e não lidas (F9-16), disponibilidade
// (F9-18), socket do Roteiro desligado (F9-19) e o cronograma da escala que vira a noite (F9-21).
const api = vi.hoisted(() => ({
  getEventRoadmap: vi.fn(),
  getEventTasks: vi.fn(async () => ({ data: [] })),
  getChatMessages: vi.fn(),
  getMyChats: vi.fn(),
  getAvailability: vi.fn(),
  deleteAvailability: vi.fn(),
  apiFetch: vi.fn(),
  addNotification: vi.fn(),
  io: vi.fn(),
}));
vi.mock('socket.io-client', () => ({ io: api.io }));
// '../../services/api' e '@/services/api' são o mesmo módulo: um mock só, com tudo.
vi.mock('../../services/api', () => ({
  collaboratorProfileAPI: {
    getEventRoadmap: api.getEventRoadmap, getEventTasks: api.getEventTasks, toggleTask: vi.fn(), addExpense: vi.fn(), sendUrgentAlert: vi.fn(),
    getAvailability: api.getAvailability, deleteAvailability: api.deleteAvailability, updateAvailability: vi.fn(),
  },
  collaboratorMessagesAPI: { sendMessage: vi.fn(), getChatMessages: api.getChatMessages, getMyChats: api.getMyChats, createSupportChat: vi.fn() },
  api: { post: vi.fn() },
  apiFetch: api.apiFetch,
  collaboratorFunctionsAPI: { getAll: vi.fn() },
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-eu', name: 'Bruno Técnico', role: 'COLLABORATOR' } }) }));
vi.mock('../../components/collaborator/CollaboratorLayout', () => ({
  CollaboratorLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: api.addNotification }) }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: api.addNotification }) }));
vi.mock('@/components/admin/AdminLayout', () => ({ AdminLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/hooks', () => ({
  useCollaborators: () => ({
    collaborators: [{ id: 'c2', name: 'Bruno Reis', email: 'bruno@teste.com', role: 'SOUND_TECHNICIAN', status: 'ACTIVE', hourlyRate: '45', totalEvents: 2, createdAt: '2026-11-01T12:00:00.000Z', user: { verified: true, role: 'COLLABORATOR', isActive: true } }],
    isLoading: false, error: null, fetchCollaborators: vi.fn(), deleteCollaborator: vi.fn(),
  }),
}));
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const semAnimacao = (tag: string) =>
    React.forwardRef<HTMLElement, Record<string, unknown>>(({ initial: _i, animate: _a, exit: _e, transition: _t, ...props }, ref) =>
      React.createElement(tag, { ...props, ref }),
    );
  return {
    AnimatePresence: ({ children }: { children: ReactNode }) => React.createElement(React.Fragment, null, children),
    motion: { div: semAnimacao('div'), form: semAnimacao('form'), aside: semAnimacao('aside') },
  };
});

import { useSocket } from '../../hooks/useSocket';
import { useRoadmapTaskRefresh } from '../../hooks/useRoadmapTaskRefresh';
import CollaboratorEventRoadmapPage from '../collaborator/CollaboratorEventRoadmapPage';
import CollaboratorMessagesPage from '../collaborator/CollaboratorMessagesPage';
import CollaboratorAvailabilityPage from '../collaborator/CollaboratorAvailabilityPage';
import { ModalProvider } from '@/components/modals/ModalContext';
import AdminCollaboratorsPage from '../admin/AdminCollaboratorsPage';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
beforeEach(() => {
  vi.clearAllMocks();
  api.io.mockReturnValue({ on: vi.fn(), off: vi.fn(), once: vi.fn(), emit: vi.fn(), disconnect: vi.fn(), connected: false });
});

describe('F9-19: socket', () => {
  it('useSocket com enabled: false não abre conexão; sem a opção, abre como antes', () => {
    renderHook(() => useSocket('event:b1', { enabled: false }));
    expect(api.io).not.toHaveBeenCalled();
    renderHook(() => useSocket('mural:1'));
    expect(api.io).toHaveBeenCalledTimes(1);
  });

  it('o Roteiro não abre conexão (VITE_REALTIME_ENABLED desligado por padrão)', async () => {
    api.getEventRoadmap.mockResolvedValue({ data: roteiro('22:00', '02:00') });
    await abrirRoteiro();
    expect(api.io).not.toHaveBeenCalled();
  });
});

function roteiro(startTime: string, endTime: string) {
  return {
    id: 'XP-ANA-20261210-2230-K4Q', status: 'CONFIRMED', eventTitle: 'Casamento Silva',
    eventDate: '2026-12-12T23:00:00.000Z', eventEndDate: '2026-12-13T07:00:00.000Z', city: 'BH',
    tasks: [], expenses: [], chats: [],
    eventCollaborators: [{ id: 'a-1', status: 'CONFIRMED', startTime, endTime, totalPayment: 300, collaborator: { userId: 'u-eu', user: { id: 'u-eu', name: 'Bruno Técnico' } } }],
  };
}
async function abrirRoteiro() {
  render(
    <MemoryRouter initialEntries={['/colaborador/eventos/XP-ANA-20261210-2230-K4Q']}>
      <Routes><Route path="/colaborador/eventos/:id" element={<CollaboratorEventRoadmapPage />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Casamento Silva' });
}

describe('F9-21: cronograma', () => {
  it('escala das 22:00 às 02:00: o término vem depois do início (no dia seguinte), não antes', async () => {
    api.getEventRoadmap.mockResolvedValue({ data: roteiro('22:00', '02:00') });
    await abrirRoteiro();
    const textos = screen.getAllByText(/Seu horário de (início|término)/).map((el) => el.textContent);
    expect(textos).toEqual(['Seu horário de início', 'Seu horário de término']);
  });
});

describe('F9-14: recarga do Roteiro só perto do evento', () => {
  const AGORA = new Date('2026-12-10T12:00:00.000Z');
  let escondida = false;
  beforeEach(() => {
    vi.useFakeTimers({ now: AGORA });
    escondida = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => escondida });
  });
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(document, 'hidden');
  });
  const avancar = async (ms: number) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  };

  it('evento daqui a 3 dias: nada sozinho; voltar para a aba recarrega uma vez; 6 h antes da montagem começa a cada 60 s', async () => {
    const montagem = new Date(AGORA.getTime() + 3 * 24 * 3600 * 1000);
    const fim = new Date(montagem.getTime() + 10 * 3600 * 1000);
    renderHook(() => useRoadmapTaskRefresh('b1', fim.toISOString(), () => undefined, montagem.toISOString()));

    await avancar(3 * 3600 * 1000);
    expect(api.getEventTasks).not.toHaveBeenCalled();

    escondida = true;
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    escondida = false;
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await avancar(0);
    expect(api.getEventTasks).toHaveBeenCalledTimes(1);

    // Até 6 h antes da montagem: 3 dias - 6 h - as 3 h que já passaram.
    await avancar((3 * 24 - 6 - 3) * 3600 * 1000 - 60_000);
    expect(api.getEventTasks).toHaveBeenCalledTimes(1);
    await avancar(3 * 60_000);
    expect(api.getEventTasks.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('o Roteiro passa o início do evento: evento daqui a 3 dias, aberto por 30 min, nenhuma recarga sozinho', async () => {
    const inicio = new Date(AGORA.getTime() + 3 * 24 * 3600 * 1000);
    api.getEventRoadmap.mockResolvedValue({ data: { ...roteiro('20:00', '23:00'), eventDate: inicio.toISOString(), eventEndDate: new Date(inicio.getTime() + 5 * 3600 * 1000).toISOString() } });
    render(
      <MemoryRouter initialEntries={['/colaborador/eventos/XP-ANA-20261210-2230-K4Q']}>
        <Routes><Route path="/colaborador/eventos/:id" element={<CollaboratorEventRoadmapPage />} /></Routes>
      </MemoryRouter>,
    );
    await avancar(0);
    await avancar(0);
    expect(api.getEventRoadmap).toHaveBeenCalledTimes(1);
    await avancar(30 * 60_000);
    expect(api.getEventTasks).not.toHaveBeenCalled();
  });

  it('sem o início informado, vale a regra de antes (recarga desde já)', async () => {
    const fim = new Date(AGORA.getTime() + 3600 * 1000);
    renderHook(() => useRoadmapTaskRefresh('b1', fim.toISOString(), () => undefined));
    await avancar(2 * 60_000);
    expect(api.getEventTasks).toHaveBeenCalledTimes(2);
  });
});

describe('F9-16: Mensagens', () => {
  it('"Mensagens anteriores" busca a página seguinte e põe antes; abrir a conversa zera o contador de não lidas', async () => {
    api.getMyChats.mockResolvedValue({ data: [{ id: 'ch-1', name: 'Evento: Casamento', type: 'GROUP', participants: [], messages: [{ id: 'm9', content: 'Oi', createdAt: '2026-12-10T10:00:00.000Z', sender: { id: 'u-ana', name: 'Ana' } }], unreadCount: 3, updatedAt: '2026-12-10T10:00:00.000Z' }] });
    const msg = (id: string, content: string) => ({ id, content, createdAt: '2026-12-10T10:00:00.000Z', sender: { id: 'u-ana', name: 'Ana' }, reads: [] });
    api.getChatMessages.mockImplementation(async (_id: string, page?: number) => (page === 2
      ? { data: { messages: [msg('m1', 'Mensagem antiga')], pagination: { hasMore: false } } }
      : { data: { messages: [msg('m9', 'Mensagem recente')], pagination: { hasMore: true } } }));
    render(<MemoryRouter><CollaboratorMessagesPage /></MemoryRouter>);

    expect(await screen.findByLabelText('3 não lidas')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Evento: Casamento'));
    expect(await screen.findByText('Mensagem recente')).toBeInTheDocument();
    expect(screen.queryByLabelText('3 não lidas')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Mensagens anteriores' }));
    expect(await screen.findByText('Mensagem antiga')).toBeInTheDocument();
    expect(api.getChatMessages).toHaveBeenLastCalledWith('ch-1', 2);
    const ordem = screen.getAllByText(/Mensagem (antiga|recente)/).map((el) => el.textContent);
    expect(ordem).toEqual(['Mensagem antiga', 'Mensagem recente']);
    expect(screen.queryByRole('button', { name: 'Mensagens anteriores' })).toBeNull();
  });
});

describe('F9-18: disponibilidade', () => {
  it('lista só de hoje em diante e permite remover', async () => {
    const hoje = new Date();
    const dia = (delta: number) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + delta);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00.000Z`;
    };
    api.getAvailability.mockResolvedValue({ data: [
      { id: 'av-ontem', date: dia(-1), startTime: '09:00', endTime: '17:00', status: 'AVAILABLE', notes: 'passada' },
      { id: 'av-amanha', date: dia(1), startTime: '09:00', endTime: '17:00', status: 'AVAILABLE', notes: 'futura' },
    ] });
    api.deleteAvailability.mockResolvedValue({ data: {} });
    render(<MemoryRouter><CollaboratorAvailabilityPage /></MemoryRouter>);

    expect(await screen.findByText('futura')).toBeInTheDocument();
    expect(screen.queryByText('passada')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Remover a disponibilidade/ }));
    await waitFor(() => expect(api.deleteAvailability).toHaveBeenCalledWith('av-amanha'));
    await waitFor(() => expect(screen.queryByText('futura')).toBeNull());
  });
});

describe('F9-13: dados para pagamento no painel', () => {
  it('o botão abre a janela com PIX, conta e o meio preferido, pela rota do admin', async () => {
    api.apiFetch.mockResolvedValue({ name: 'Bruno Reis', pixKey: 'bruno@pix.test', preferredMethod: 'pix', bankAccount: { bank: 'Banco X', agency: '0001', account: '12345-6', accountType: 'poupanca' } });
    render(<MemoryRouter><ModalProvider><AdminCollaboratorsPage /></ModalProvider></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Dados para pagamento de Bruno Reis' }));
    const janela = await screen.findByRole('dialog');
    expect(await within(janela).findByText('bruno@pix.test')).toBeInTheDocument();
    expect(within(janela).getByText('PIX')).toBeInTheDocument();
    expect(within(janela).getByText(/Banco X · agência 0001 · conta 12345-6 · poupança/)).toBeInTheDocument();
    expect(api.apiFetch).toHaveBeenCalledWith('/collaborators/c2/payment-info');
  });

  it('sem nada informado, a janela diz onde o colaborador preenche', async () => {
    api.apiFetch.mockResolvedValue({ name: 'Bruno Reis', pixKey: null, preferredMethod: null, bankAccount: null });
    render(<MemoryRouter><ModalProvider><AdminCollaboratorsPage /></ModalProvider></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Dados para pagamento de Bruno Reis' }));
    expect(await screen.findByText(/ainda não informou PIX nem conta/)).toBeInTheDocument();
  });
});
