import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { act, render, screen } from '@testing-library/react';

const { getOrCreateBookingChat, getChatMessages, sendMessage } = vi.hoisted(() => ({
  getOrCreateBookingChat: vi.fn(),
  getChatMessages: vi.fn(),
  sendMessage: vi.fn(),
}));
vi.mock('../../../services/api', () => ({
  collaboratorMessagesAPI: { getOrCreateBookingChat, getChatMessages, sendMessage },
}));

import { BookingChatPanel } from '../BookingChatPanel';

// Achado (auditoria ponta a ponta): o painel consultava as mensagens a cada 6 s mesmo com a aba
// escondida — cada consulta lê o banco, e uma aba esquecida mantinha o Neon (plano free) acordado
// o dia todo, gastando a cota mensal. Agora pausa com a aba escondida e, ao voltar, busca na hora.

// Mensagens do chat no "servidor": cada GET devolve o que existe naquele momento.
let noServidor: Array<{ id: string; content: string; createdAt: string; sender: { id: string; name: string } }>;
const msg = (id: string, content: string) => ({
  id,
  content,
  createdAt: '2026-11-02T12:00:00.000Z',
  sender: { id: 'staff-1', name: 'Equipe X' },
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

const renderPainel = async () => {
  const view = render(<BookingChatPanel bookingId="XP-1" currentUserId="cliente-1" />);
  await avancar(0); // abre o chat e faz a primeira carga
  return view;
};

describe('BookingChatPanel — polling das mensagens', () => {
  beforeAll(() => {
    // jsdom não implementa scrollIntoView (o painel rola até a última mensagem).
    Element.prototype.scrollIntoView = vi.fn();
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
    noServidor = [msg('m1', 'Olá! Recebemos sua reserva.')];
    getOrCreateBookingChat.mockReset();
    getChatMessages.mockReset();
    getOrCreateBookingChat.mockImplementation(async (bookingId: string) => ({ data: { id: `chat-${bookingId}` } }));
    getChatMessages.mockImplementation(async (chatId: string) => ({
      data: { messages: chatId === 'chat-XP-1' ? [...noServidor] : [] },
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aba visível: busca novas mensagens a cada 6 s', async () => {
    await renderPainel();
    expect(getChatMessages).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Olá! Recebemos sua reserva.')).toBeInTheDocument();

    await avancar(12_000);

    expect(getChatMessages).toHaveBeenCalledTimes(3);
    expect(getChatMessages).toHaveBeenLastCalledWith('chat-XP-1');
  });

  it('aba escondida: não consulta o servidor (antes: a cada 6 s, mesmo escondida)', async () => {
    await renderPainel();
    getChatMessages.mockClear();
    mudarVisibilidade(true);

    await avancar(10 * 60_000);

    expect(getChatMessages).not.toHaveBeenCalled();
  });

  it('ao voltar para a aba, busca na hora e mostra o que chegou enquanto estava escondida', async () => {
    await renderPainel();
    mudarVisibilidade(true);
    await avancar(60_000);
    noServidor.push(msg('m2', 'Seu evento foi confirmado.'));
    getChatMessages.mockClear();

    mudarVisibilidade(false);
    await avancar(0); // sem esperar o próximo ciclo de 6 s

    expect(getChatMessages).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Seu evento foi confirmado.')).toBeInTheDocument();
  });

  it('desmontado, não consulta mais (nem ao voltar para a aba)', async () => {
    const { unmount } = await renderPainel();
    unmount();
    getChatMessages.mockClear();

    mudarVisibilidade(true);
    mudarVisibilidade(false);
    await avancar(60_000);

    expect(getChatMessages).not.toHaveBeenCalled();
  });
});
