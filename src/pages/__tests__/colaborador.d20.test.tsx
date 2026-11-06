import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';

// D20 + P19 (aprovadas em 02/11/2026). No Roteiro, "Alertar produção" escrevia no chat do evento (que
// ninguém lê e que o cliente lia), ficava apagado em evento sem chat e falhava calado. Agora é um link do
// WhatsApp de plantão com o evento escrito, com "Ligar" ao lado, os dois sempre ativos; o clique também
// pede o e-mail ao dono, sem segurar o WhatsApp, e mostra se o e-mail saiu. Na aba Privacidade: o chat do
// evento é só da equipe.
const { getEventRoadmap, sendUrgentAlert, sendMessage, getMyProfile, getSettings, socket } = vi.hoisted(() => ({
  getEventRoadmap: vi.fn(),
  sendUrgentAlert: vi.fn(),
  sendMessage: vi.fn(),
  getMyProfile: vi.fn(),
  getSettings: vi.fn(),
  // Funções estáveis, como as do useSocket de verdade (useCallback): o Roteiro recarrega quando muda o emit.
  socket: { on: () => () => undefined, emit: () => undefined, isConnected: false },
}));
vi.mock('../../services/api', () => ({
  collaboratorProfileAPI: {
    getEventRoadmap,
    sendUrgentAlert,
    getMyProfile,
    getSettings,
    toggleTask: vi.fn(),
    addExpense: vi.fn(),
    updateSettings: vi.fn(),
    updateProfile: vi.fn(),
  },
  collaboratorMessagesAPI: { sendMessage },
  uploadAPI: { uploadFile: vi.fn() },
  authAPI: { updateProfile: vi.fn(), changePassword: vi.fn() },
}));
vi.mock('../../hooks/useSocket', () => ({ useSocket: () => socket }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-eu', name: 'Bruno Técnico', role: 'COLLABORATOR' } }),
}));
vi.mock('../../components/collaborator/CollaboratorLayout', () => ({
  CollaboratorLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));

import CollaboratorEventRoadmapPage from '../collaborator/CollaboratorEventRoadmapPage';
import CollaboratorSettingsPage from '../collaborator/CollaboratorSettingsPage';

// Evento sem chat (chats: []): antes o botão ficava apagado. O processo roda em UTC aqui: 01:30 UTC do
// dia 11 é 22:30 do dia 10 em Brasília.
const ROTEIRO = {
  id: 'XP-ANA-20261210-2230-K4Q',
  status: 'CONFIRMED',
  eventTitle: 'Casamento Silva',
  eventDate: '2026-12-11T01:30:00.000Z',
  street: 'Rua A',
  addressNumber: '10',
  city: 'Belo Horizonte',
  state: 'MG',
  tasks: [],
  expenses: [],
  eventCollaborators: [],
  chats: [],
};
const FALHA = 'Não conseguimos avisar por e-mail. Use o WhatsApp ou ligue.';

const abrirRoteiro = () => {
  render(
    <MemoryRouter initialEntries={[`/colaborador/eventos/${ROTEIRO.id}`]}>
      <Routes>
        <Route path="/colaborador/eventos/:id" element={<CollaboratorEventRoadmapPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return screen.findByRole('link', { name: /Alertar produção/ });
};

// O jsdom não abre outra aba: o clique é cancelado no document, depois que a página já tratou o clique, e
// fica anotado se a própria página o cancelou (se cancelasse, o WhatsApp não abriria pelo link).
let canceladoPelaPagina: boolean | null = null;
const anotaECancela = (event: Event) => {
  canceladoPelaPagina = event.defaultPrevented;
  event.preventDefault();
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('TZ', 'UTC');
  vi.stubEnv('VITE_WHATSAPP_PHONE', '(31) 98925-2272');
  getEventRoadmap.mockResolvedValue({ data: ROTEIRO });
  getMyProfile.mockResolvedValue({ data: { data: { phone: '', specialties: [], user: { name: 'Eu', email: 'eu@x.test' } } } });
  getSettings.mockResolvedValue({ data: {} });
  canceladoPelaPagina = null;
  document.addEventListener('click', anotaECancela);
});

afterEach(() => {
  document.removeEventListener('click', anotaECancela);
  vi.unstubAllEnvs();
});

describe('Roteiro — P19: "Alertar produção"', () => {
  it('é um link do WhatsApp de plantão com o evento escrito, e "Ligar" chama o mesmo número; os dois ativos mesmo sem chat', async () => {
    const alerta = await abrirRoteiro();

    expect(alerta.tagName).toBe('A');
    expect(alerta).toHaveAttribute('target', '_blank');
    expect(alerta).not.toHaveAttribute('aria-disabled', 'true');
    const url = new URL(alerta.getAttribute('href') ?? '');
    expect(`${url.origin}${url.pathname}`).toBe('https://wa.me/5531989252272');
    const texto = url.searchParams.get('text') ?? '';
    expect(texto).toContain('Bruno Técnico');
    expect(texto).toContain('Casamento Silva');
    expect(texto).toContain('XP-ANA-20261210-2230-K4Q');
    expect(texto).toContain('10/12/2026 às 22:30');
    expect(texto).toContain('Rua A, 10');
    expect(texto).toContain('Belo Horizonte/MG');

    const ligar = screen.getByRole('link', { name: /Ligar/ });
    expect(ligar).toHaveAttribute('href', 'tel:+5531989252272');
    expect(ligar).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('o clique pede o e-mail ao dono sem segurar o WhatsApp, não escreve no chat e mostra "Produção avisada por e-mail."', async () => {
    sendUrgentAlert.mockResolvedValue({ data: { emailQueued: true, deduplicated: false } });
    const alerta = await abrirRoteiro();

    fireEvent.click(alerta);

    expect(canceladoPelaPagina).toBe(false);
    expect(sendUrgentAlert).toHaveBeenCalledWith('XP-ANA-20261210-2230-K4Q');
    expect(await screen.findByText('Produção avisada por e-mail.')).toBeInTheDocument();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('e-mail que não saiu (falha na chamada ou emailQueued false): avisa para usar o WhatsApp ou ligar', async () => {
    sendUrgentAlert
      .mockRejectedValueOnce(new Error('sem rede'))
      .mockResolvedValueOnce({ data: { emailQueued: false, deduplicated: false } });
    const alerta = await abrirRoteiro();

    fireEvent.click(alerta);
    expect(await screen.findByText(FALHA)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /Alertar produção/ }));
    expect(screen.getByText('Avisando a produção por e-mail…')).toBeInTheDocument();
    expect(await screen.findByText(FALHA)).toBeInTheDocument();
    expect(sendUrgentAlert).toHaveBeenCalledTimes(2);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  // Revisão: só a confirmação do servidor (emailQueued true) vira "avisada"; resposta sem ela é falha.
  it('resposta sem a confirmação do e-mail (sem emailQueued) não vira "Produção avisada"', async () => {
    sendUrgentAlert.mockResolvedValue({ data: {} });
    const alerta = await abrirRoteiro();

    fireEvent.click(alerta);

    expect(await screen.findByText(FALHA)).toBeInTheDocument();
    expect(screen.queryByText('Produção avisada por e-mail.')).toBeNull();
  });
});

describe('Configurações — D20: aba Privacidade', () => {
  it('diz que o chat do evento é só da equipe', async () => {
    render(<MemoryRouter><CollaboratorSettingsPage /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('tab', { name: /Privacidade/ }));

    expect(screen.getByText(/O chat do evento é só da equipe/)).toBeInTheDocument();
  });

  it('com o chat do cliente religado (VITE_CLIENT_BOOKING_CHAT_ENABLED=true), diz que o cliente também participa', async () => {
    vi.stubEnv('VITE_CLIENT_BOOKING_CHAT_ENABLED', 'true');
    render(<MemoryRouter><CollaboratorSettingsPage /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('tab', { name: /Privacidade/ }));

    expect(screen.getByText(/o cliente da reserva também lê e escreve/)).toBeInTheDocument();
    expect(screen.queryByText(/O chat do evento é só da equipe/)).toBeNull();
  });
});
