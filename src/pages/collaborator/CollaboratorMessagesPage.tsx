import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  Search,
  Phone,
  Video,
  MoreVertical,
  CheckCheck,
  Loader2
} from 'lucide-react';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { collaboratorMessagesAPI } from '../../services/api';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { logger } from '../../utils/logger';

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

const CollaboratorMessagesPage: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await collaboratorMessagesAPI.getMyChats();
      setChats(response.data);
    } catch (error) {
      logger.error('Erro ao carregar chats:', 'CollaboratorMessagesPage', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const response = await collaboratorMessagesAPI.getChatMessages(chatId);
      setMessages(response.data.messages);
    } catch (error) {
      logger.error('Erro ao carregar mensagens:', 'CollaboratorMessagesPage', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedChat || !newMessage.trim() || sending) return;

    try {
      setSending(true);
      await collaboratorMessagesAPI.sendMessage(selectedChat.id, newMessage.trim());
      setNewMessage('');
      await loadMessages(selectedChat.id);
    } catch (error) {
      logger.error('Erro ao enviar mensagem:', 'CollaboratorMessagesPage', error);
    } finally {
      setSending(false);
    }
  };

  const createSupportChat = async () => {
    try {
      const response = await collaboratorMessagesAPI.createSupportChat();
      const newChat = response.data;
      setChats(prev => [newChat, ...prev]);
      setSelectedChat(newChat);
    } catch (error) {
      logger.error('Erro ao criar chat de suporte:', 'CollaboratorMessagesPage', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.participants.some(p =>
      p.user.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) {
    return (
      <CollaboratorLayout>
        <div className="flex items-center justify-center min-h-96">
          <BrandLoader size={120} label="Carregando mensagens..." />
        </div>
      </CollaboratorLayout>
    );
  }

  return (
    <CollaboratorLayout
      title="Mensagens"
      breadcrumbs={[
        { name: 'Colaborador', href: '/collaborator' },
        { name: 'Mensagens' }
      ]}
    >
      <div className="flex h-[calc(100vh-200px)] bg-card border rounded-lg overflow-hidden">
        {/* Sidebar com lista de chats */}
        <div className="w-80 border-r bg-muted/30">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Conversas</h2>
              <Button
                onClick={createSupportChat}
                size="sm"
                className="text-xs"
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Suporte
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma conversa encontrada</p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedChat?.id === chat.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      {chat.type === 'SUPPORT' ? (
                        <MessageSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Users className="w-5 h-5 text-primary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">
                          {chat.name || chat.participants.map(p => p.user.name).join(', ')}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-1">
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
                </div>
              ))
            )}
          </div>
        </div>

        {/* Área de mensagens */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              {/* Header do chat */}
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      {selectedChat.type === 'SUPPORT' ? (
                        <MessageSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Users className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {selectedChat.name || selectedChat.participants.map(p => p.user.name).join(', ')}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedChat.participants.length} participante{selectedChat.participants.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Video className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Lista de mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex space-x-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-primary">
                        {message.sender.name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm">{message.sender.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.createdAt)}
                        </span>
                        {message.reads.length > 0 && (
                          <CheckCheck className="w-3 h-3 text-primary" />
                        )}
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3 max-w-md">
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de mensagem */}
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    size="sm"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Selecione uma conversa
                </h3>
                <p className="text-muted-foreground">
                  Escolha uma conversa para começar a enviar mensagens
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </CollaboratorLayout>
  );
};

export default CollaboratorMessagesPage;