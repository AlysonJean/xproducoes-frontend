import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { collaboratorMessagesAPI } from '../../services/api';
import { logger } from '../../utils/logger';

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string };
}

// Achado (auditoria de produto): não existia nenhum canal de chat in-app para o cliente —
// só o botão flutuante do WhatsApp, sem contexto da reserva. O chat de evento
// (Chat{type:'EVENT'}) já existia, mas era só de bastidores (staff/colaboradores). Este
// painel reaproveita a mesma infraestrutura (getOrCreateBookingChat abre para o dono da
// reserva) em vez de criar um sistema de mensagens paralelo.
export function BookingChatPanel({ bookingId, currentUserId }: { bookingId: string; currentUserId?: string }) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (id: string) => {
    try {
      const resp = await collaboratorMessagesAPI.getChatMessages(id);
      const data = resp?.data?.data ?? resp?.data;
      setMessages(data?.messages ?? []);
    } catch (err) {
      logger.error('Erro ao carregar mensagens', 'BookingChatPanel', err);
    }
  }, []);

  const initChat = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await collaboratorMessagesAPI.getOrCreateBookingChat(bookingId);
      const chat = resp?.data?.data ?? resp?.data;
      if (!chat?.id) throw new Error('Chat não retornado');
      setChatId(chat.id);
      await loadMessages(chat.id);
    } catch (err) {
      logger.error('Erro ao iniciar chat da reserva', 'BookingChatPanel', err);
      setError('Não foi possível carregar as mensagens agora.');
    } finally {
      setLoading(false);
    }
  }, [bookingId, loadMessages]);

  useEffect(() => {
    initChat();
  }, [initChat]);

  // Verifica por novas mensagens periodicamente enquanto o painel está aberto — não há
  // integração de socket para chat no frontend ainda (só REST), então polling simples é o
  // caminho proporcional aqui em vez de introduzir um novo padrão de tempo real sem precedente.
  useEffect(() => {
    if (!chatId) return;
    const interval = setInterval(() => loadMessages(chatId), 6000);
    return () => clearInterval(interval);
  }, [chatId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!chatId || !newMessage.trim() || sending) return;
    try {
      setSending(true);
      await collaboratorMessagesAPI.sendMessage(chatId, newMessage.trim());
      setNewMessage('');
      await loadMessages(chatId);
    } catch (err) {
      logger.error('Erro ao enviar mensagem', 'BookingChatPanel', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        Mensagens sobre esta reserva
      </h2>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <>
          <div className="space-y-3 max-h-80 overflow-y-auto mb-4 pr-1">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma mensagem ainda. Envie uma pergunta sobre seu evento para nossa equipe.
              </p>
            ) : (
              messages.map((message) => {
                const isMine = message.sender.id === currentUserId;
                return (
                  <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 ${isMine ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-foreground'}`}>
                      {!isMine && (
                        <p className="text-xs font-semibold opacity-70 mb-0.5">{message.sender.name}</p>
                      )}
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="px-3 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-colors"
              aria-label="Enviar mensagem"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default BookingChatPanel;
