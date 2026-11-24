import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';

// Onda 3 da auditoria de 19/11, lote 3a, no site: chat do Roteiro (F9-03), recibo do reembolso (F9-04), cachê (F9-06),
// Mensagens com o Suporte (F9-01, F9-02) e os reembolsos da equipe na ficha da reserva (F9-05).
const api = vi.hoisted(() => ({
  getEventRoadmap: vi.fn(),
  getEventTasks: vi.fn(async () => ({ data: [] })),
  addExpense: vi.fn(),
  getChatMessages: vi.fn(),
  sendMessage: vi.fn(),
  getMyChats: vi.fn(),
  createSupportChat: vi.fn(),
  apiFetch: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('../../services/api', () => ({
  collaboratorProfileAPI: { getEventRoadmap: api.getEventRoadmap, getEventTasks: api.getEventTasks, toggleTask: vi.fn(), addExpense: api.addExpense, sendUrgentAlert: vi.fn() },
  collaboratorMessagesAPI: { sendMessage: api.sendMessage, getChatMessages: api.getChatMessages, getMyChats: api.getMyChats, createSupportChat: api.createSupportChat },
  apiFetch: api.apiFetch,
}));
// Como o useSocket de verdade: funções estáveis (uma função nova a cada render recarregaria o Roteiro sem parar).
const socket = vi.hoisted(() => ({ on: () => () => undefined, emit: () => undefined, isConnected: false }));
vi.mock('../../hooks/useSocket', () => ({ useSocket: () => socket }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-eu', name: 'Bruno Técnico', role: 'COLLABORATOR' } }) }));
vi.mock('../../components/collaborator/CollaboratorLayout', () => ({
  CollaboratorLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: api.addNotification }) }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: api.addNotification }) }));
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
import CollaboratorMessagesPage from '../collaborator/CollaboratorMessagesPage';
import { BookingExpenses } from '../../components/bookings/BookingExpenses';

const minhaEscala = (pay: Record<string, unknown>) => ({
  id: 'a-1', status: 'CONFIRMED', role: 'TECHNICIAN', startTime: '18:00', endTime: '23:00',
  collaborator: { userId: 'u-eu', user: { id: 'u-eu', name: 'Bruno Técnico' } },
  ...pay,
});
const roteiro = (pay: Record<string, unknown> = { totalPayment: 450, fixedRate: 450 }) => ({
  id: 'XP-ANA-20261210-2230-K4Q', status: 'CONFIRMED', eventTitle: 'Casamento Silva',
  eventDate: '2026-12-12T22:00:00.000Z', eventEndDate: '2026-12-13T03:00:00.000Z', city: 'Belo Horizonte',
  tasks: [], expenses: [], eventCollaborators: [minhaEscala(pay)],
  chats: [{ id: 'chat-1', name: null, type: 'EVENT', updatedAt: '2026-12-10T10:00:00.000Z' }],
});
const abrirRoteiro = async () => {
  render(
    <MemoryRouter initialEntries={['/colaborador/eventos/XP-ANA-20261210-2230-K4Q']}>
      <Routes>
        <Route path="/colaborador/eventos/:id" element={<CollaboratorEventRoadmapPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Casamento Silva' });
};

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
beforeEach(() => {
  vi.clearAllMocks();
  api.getEventRoadmap.mockResolvedValue({ data: roteiro() });
  api.getChatMessages.mockResolvedValue({ data: { messages: [{ id: 'm-1', senderId: 'u-ana', content: 'Chego às 17h', createdAt: '2026-12-10T12:00:00.000Z' }] } });
});

describe('Roteiro: chat (F9-03)', () => {
  it('abrir a aba Chat busca as mensagens; a enviada entra na lista na hora', async () => {
    await abrirRoteiro();
    expect(api.getChatMessages).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('tab', { name: /Chat/ }));
    expect(await screen.findByText('Chego às 17h')).toBeInTheDocument();
    expect(api.getChatMessages).toHaveBeenCalledWith('chat-1');

    api.sendMessage.mockResolvedValue({ data: { id: 'm-2', senderId: 'u-eu', content: 'Combinado', createdAt: '2026-12-10T12:05:00.000Z' } });
    fireEvent.change(screen.getByLabelText('Mensagem para a equipe'), { target: { value: 'Combinado' } });
    fireEvent.submit(screen.getByLabelText('Mensagem para a equipe').closest('form')!);
    expect(await screen.findByText('Combinado')).toBeInTheDocument();
    expect(screen.getByText('Chego às 17h')).toBeInTheDocument();
  });

  it('falha ao carregar: aviso na aba, sem quebrar a página', async () => {
    api.getChatMessages.mockRejectedValue(new Error('rede'));
    await abrirRoteiro();
    fireEvent.click(screen.getByRole('tab', { name: /Chat/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não conseguimos carregar as mensagens');
  });
});

describe('Roteiro: reembolso (F9-04, B3-03) e cachê (F9-06)', () => {
  it('o formulário não tem mais o botão do recibo; o pedido vai só com valor e descrição', async () => {
    api.addExpense.mockResolvedValue({ data: {} });
    await abrirRoteiro();
    fireEvent.click(screen.getByRole('tab', { name: /Logística/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Solicitar novo reembolso/ }));
    expect(screen.queryByRole('button', { name: /Tirar foto/ })).toBeNull();
    expect(screen.getByText(/mande a foto pelo WhatsApp da produção/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Valor total/), { target: { value: '35.5' } });
    fireEvent.change(screen.getByLabelText(/Descrição/), { target: { value: ' Estacionamento ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pedir reembolso' }));
    await waitFor(() => expect(api.addExpense).toHaveBeenCalledWith('XP-ANA-20261210-2230-K4Q', { amount: 35.5, description: 'Estacionamento' }));
  });

  it('o motivo da recusa do servidor aparece no aviso', async () => {
    api.addExpense.mockRejectedValue({ response: { data: { message: 'Valor acima de R$ 10.000: fale direto com a produção.' } } });
    await abrirRoteiro();
    fireEvent.click(screen.getByRole('tab', { name: /Logística/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Solicitar novo reembolso/ }));
    fireEvent.change(screen.getByLabelText(/Valor total/), { target: { value: '20000' } });
    fireEvent.change(screen.getByLabelText(/Descrição/), { target: { value: 'Hotel' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pedir reembolso' }));
    await waitFor(() => expect(api.addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'Valor acima de R$ 10.000: fale direto com a produção.' })));
  });

  it.each([
    [{ totalPayment: 450, fixedRate: 450 }, /450,00/],
    [{ totalPayment: null, fixedRate: 300 }, /300,00/],
    [{ totalPayment: null, fixedRate: null }, /A combinar/],
  ])('cachê %o', async (pay, esperado) => {
    api.getEventRoadmap.mockResolvedValue({ data: roteiro(pay) });
    await abrirRoteiro();
    const rotulo = screen.getByText('Cachê estimado');
    expect(rotulo.parentElement).toHaveTextContent(esperado);
  });
});

describe('Mensagens: Suporte (F9-01, F9-02)', () => {
  it('o Suporte sem participantes nem mensagens não derruba a página; a conversa explica por onde vem a resposta', async () => {
    api.getMyChats.mockResolvedValue({ data: [] });
    api.createSupportChat.mockResolvedValue({ data: { id: 'sup-1', name: 'Suporte', type: 'SUPPORT', updatedAt: '2026-12-10T10:00:00.000Z' } });
    api.getChatMessages.mockResolvedValue({ data: { messages: [] } });
    render(<MemoryRouter><CollaboratorMessagesPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Suporte/ }));
    expect(await screen.findByText(/a resposta vem por WhatsApp ou telefone/)).toBeInTheDocument();
    expect(screen.getAllByText('Suporte').length).toBeGreaterThan(0);
  });
});

describe('Ficha da reserva: reembolsos da equipe (F9-05)', () => {
  const pedidos = [
    { id: 'e-1', amount: '35.50', description: 'Estacionamento', status: 'PENDING', createdAt: '2026-12-12T23:00:00.000Z', collaborator: { name: 'Bruno Técnico' } },
    { id: 'e-2', amount: 80, description: 'Gasolina', status: 'APPROVED', createdAt: '2026-12-12T23:30:00.000Z', collaborator: { name: 'Bruno Técnico' } },
  ];

  it('sem pedidos, não aparece', () => {
    const { container } = render(<BookingExpenses bookingId="b-1" expenses={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lista os pedidos; aprovar grava pela rota do admin e troca o selo; o decidido não tem botões', async () => {
    api.apiFetch.mockResolvedValue({ id: 'e-1', status: 'APPROVED' });
    render(<BookingExpenses bookingId="b-1" expenses={pedidos} />);
    expect(screen.getByText('1 pendente')).toBeInTheDocument();
    const linha = screen.getByText('Estacionamento').closest('li')!;
    expect(within(linha).getByText(/35,50/)).toBeInTheDocument();
    expect(within(screen.getByText('Gasolina').closest('li')!).queryByRole('button')).toBeNull();

    fireEvent.click(within(linha).getByRole('button', { name: 'Aprovar' }));
    await waitFor(() => expect(within(linha).getByText('Aprovado')).toBeInTheDocument());
    expect(api.apiFetch).toHaveBeenCalledWith('/bookings/b-1/expenses/e-1/status', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ status: 'APPROVED' }) }));
    expect(within(linha).queryByRole('button')).toBeNull();
  });

  it('recusar manda REJECTED; falha mostra o motivo e mantém os botões', async () => {
    api.apiFetch.mockRejectedValueOnce(new Error('Reembolso pendente não encontrado nesta reserva (talvez já tenha sido decidido).'));
    render(<BookingExpenses bookingId="b-1" expenses={pedidos} />);
    const linha = screen.getByText('Estacionamento').closest('li')!;
    fireEvent.click(within(linha).getByRole('button', { name: 'Recusar' }));
    await waitFor(() => expect(api.addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: expect.stringContaining('já tenha sido decidido') })));
    expect(api.apiFetch).toHaveBeenCalledWith('/bookings/b-1/expenses/e-1/status', expect.objectContaining({ body: JSON.stringify({ status: 'REJECTED' }) }));
    expect(within(linha).getByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
  });
});
