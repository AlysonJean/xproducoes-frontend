import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  Search,
  CheckCheck,
  ArrowLeft,
} from 'lucide-react';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { CollaboratorLoading, CollaboratorError } from '../../components/collaborator/CollaboratorStates';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { collaboratorMessagesAPI } from '../../services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { logger } from '../../utils/logger';
import { cn } from '../../utils/cn';

interface Chat {
  id: string;
  name: string;
  type: 'PRIVATE' | 'GROUP' | 'SUPPORT';
  participants: Array<{
    user: {
      id: string;
      name: string;
      avatarUrl?: string;
    };
  }>;
  messages: Array<{
    id: string;
    content: string;
    createdAt: string;
    sender: {
      id: string;
      name: string;
    };
  }>;
  unreadCount: number;
  updatedAt: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  reads: Array<{
    user: {
      id: string;
      name: string;
    };
  }>;
}

const BREADCRUMBS = [
  { name: 'Colaborador', href: '/colaborador/painel' },
  { name: 'Mensagens' },
];

const chatTitle = (chat: Chat) => chat.name || chat.participants.map(p => p.user.name).join(', ');

const CollaboratorMessagesPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatsError, setChatsError] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState(false);
  const [sending, setSending] = useState(false);
  const [creatingSupport, setCreatingSupport] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      setChatsError(false);
      const response = await collaboratorMessagesAPI.getMyChats();
      setChats(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      logger.error('Erro ao carregar chats:', 'CollaboratorMessagesPage', error);
      setChatsError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (chatId: string) => {
    try {
      setMessagesLoading(true);
      setMessagesError(false);
      const response = await collaboratorMessagesAPI.getChatMessages(chatId);
      setMessages(response.data?.messages ?? []);
    } catch (error) {
      logger.error('Erro ao carregar mensagens:', 'CollaboratorMessagesPage', error);
      setMessagesError(true);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
    }
  }, [selectedChat, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedChat || !newMessage.trim() || sending) return;

    try {
      setSending(true);
      await collaboratorMessagesAPI.sendMessage(selectedChat.id, newMessage.trim());
      setNewMessage('');
      await loadMessages(selectedChat.id);
    } catch (error) {
      logger.error('Erro ao enviar mensagem:', 'CollaboratorMessagesPage', error);
      addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível enviar a mensagem. Tente de novo.' });
    } finally {
      setSending(false);
    }
  };

  const createSupportChat = async () => {
    try {
      setCreatingSupport(true);
      const response = await collaboratorMessagesAPI.createSupportChat();
      const newChat = response.data;
      setChats(prev => [newChat, ...prev.filter((c) => c.id !== newChat.id)]);
      setSelectedChat(newChat);
    } catch (error) {
      logger.error('Erro ao criar chat de suporte:', 'CollaboratorMessagesPage', error);
      addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível abrir a conversa com o suporte.' });
    } finally {
      setCreatingSupport(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  const filteredChats = chats.filter(chat =>
    (chat.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.participants.some(p =>
      p.user.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <CollaboratorLayout title="Mensagens" breadcrumbs={BREADCRUMBS}>
      {loading ? (
        <CollaboratorLoading label="Carregando mensagens…" />
      ) : chatsError ? (
        <CollaboratorError message="Não conseguimos carregar suas conversas." onRetry={loadChats} />
      ) : (
        // Achado (auditoria mobile): lista com largura fixa (w-80) ao lado da conversa — em 375px a
        // conversa ficava com ~7px. No celular agora alterna: lista OU conversa (com "Voltar").
        <div className="flex h-[calc(100dvh-16rem)] min-h-[480px] bg-card border border-border rounded-lg overflow-hidden">
          {/* Lista de conversas */}
          <div
            className={cn(
              'w-full md:w-80 md:shrink-0 md:border-r border-border bg-muted/30 flex-col',
              selectedChat ? 'hidden md:flex' : 'flex'
            )}
          >
            <div className="p-4 border-b border-border space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground">Conversas</h2>
                <Button
                  onClick={createSupportChat}
                  size="sm"
                  isLoading={creatingSupport}
                  leftIcon={<MessageSquare className="w-4 h-4" />}
                >
                  Suporte
                </Button>
              </div>

              <Input
                size="sm"
                placeholder="Buscar conversas..."
                aria-label="Buscar conversas"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredChats.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" aria-hidden="true" />
                  <p>{chats.length === 0 ? 'Você ainda não tem conversas.' : 'Nenhuma conversa encontrada.'}</p>
                  {chats.length === 0 && (
                    <p className="mt-1 text-sm">Use "Suporte" para falar com a produção.</p>
                  )}
                </div>
              ) : (
                <ul>
                  {filteredChats.map((chat) => {
                    const isSelected = selectedChat?.id === chat.id;
                    return (
                      <li key={chat.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedChat(chat)}
                          aria-current={isSelected ? 'true' : undefined}
                          className={cn(
                            'w-full text-left p-4 border-b border-border transition-colors hover:bg-muted/50',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                            isSelected && 'bg-primary/10 border-l-4 border-l-primary'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
                              {chat.type === 'SUPPORT' ? (
                                <MessageSquare className="w-5 h-5 text-primary" aria-hidden="true" />
                              ) : (
                                <Users className="w-5 h-5 text-primary" aria-hidden="true" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-foreground truncate">{chatTitle(chat)}</p>
                                {chat.unreadCount > 0 && (
                                  <span
                                    className="shrink-0 bg-primary text-primary-foreground text-xs font-semibold rounded-full px-2 py-0.5"
                                    aria-label={`${chat.unreadCount} não lidas`}
                                  >
                                    {chat.unreadCount}
                                  </span>
                                )}
                              </div>

                              {chat.messages.length > 0 && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {chat.messages[0].sender.name}: {chat.messages[0].content}
                                </p>
                              )}

                              <p className="text-xs text-muted-foreground">
                                {formatDate(chat.updatedAt)}
                              </p>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Área de mensagens */}
          <div className={cn('flex-1 min-w-0 flex-col', selectedChat ? 'flex' : 'hidden md:flex')}>
            {selectedChat ? (
              <>
                {/* Cabeçalho da conversa. Achado: tinha 3 botões só de ícone (telefone, vídeo, mais
                    opções) sem ação nenhuma — removidos. */}
                <div className="p-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden shrink-0"
                      onClick={() => setSelectedChat(null)}
                      aria-label="Voltar para a lista de conversas"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="w-10 h-10 shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
                      {selectedChat.type === 'SUPPORT' ? (
                        <MessageSquare className="w-5 h-5 text-primary" aria-hidden="true" />
                      ) : (
                        <Users className="w-5 h-5 text-primary" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-medium text-foreground truncate">{chatTitle(selectedChat)}</h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedChat.participants.length} participante{selectedChat.participants.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lista de mensagens */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" aria-live="polite">
                  {messagesError ? (
                    <CollaboratorError
                      message="Não conseguimos carregar as mensagens desta conversa."
                      onRetry={() => loadMessages(selectedChat.id)}
                    />
                  ) : messagesLoading && messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground" role="status">Carregando mensagens…</p>
                  ) : messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda. Envie a primeira.</p>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className="flex gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-primary" aria-hidden="true">
                            {message.sender.name.charAt(0).toUpperCase()}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-foreground">{message.sender.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(message.createdAt)}
                            </span>
                            {message.reads.length > 0 && (
                              <CheckCheck className="w-4 h-4 text-primary" aria-label="Lida" />
                            )}
                          </div>

                          <div className="bg-muted/50 rounded-lg p-3 max-w-md">
                            <p className="text-sm text-foreground break-words">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Campo de mensagem */}
                <form onSubmit={sendMessage} className="p-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        size="sm"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        aria-label="Mensagem"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!newMessage.trim()}
                      isLoading={sending}
                      aria-label="Enviar mensagem"
                    >
                      {!sending && <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                  <h2 className="text-lg font-medium text-foreground mb-2">
                    Selecione uma conversa
                  </h2>
                  <p className="text-muted-foreground">
                    Escolha uma conversa para começar a enviar mensagens
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </CollaboratorLayout>
  );
};

export default CollaboratorMessagesPage;
