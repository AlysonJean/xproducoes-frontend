import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Calendar, 
  Settings, 
  Check,
  Eye,
  Trash2,
  Filter,
  Search,
  Volume2,
  Smartphone
} from 'lucide-react';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { SimpleCard } from '../../components/ui/Cards';

interface Notification {
  id: string;
  type: 'booking' | 'payment' | 'message' | 'system';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
}

interface NotificationSettings {
  email: {
    newBookings: boolean;
    paymentReceived: boolean;
    messageReceived: boolean;
    systemUpdates: boolean;
  };
  push: {
    newBookings: boolean;
    paymentReceived: boolean;
    messageReceived: boolean;
    systemUpdates: boolean;
  };
  sms: {
    newBookings: boolean;
    paymentReceived: boolean;
  };
  preferences: {
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
    frequency: 'immediate' | 'hourly' | 'daily';
  };
}

const CollaboratorNotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'booking' | 'payment' | 'message' | 'system'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');

  useEffect(() => {
    // Simular carregamento de dados
    const timer = setTimeout(() => {
      setNotifications([
        {
          id: '1',
          type: 'booking',
          title: 'Novo Agendamento',
          message: 'Maria Silva agendou um casamento para 15/03/2024 às 14:00h.',
          timestamp: '2024-03-10T10:30:00Z',
          isRead: false,
          priority: 'high',
          actionUrl: '/collaborator/bookings/123'
        },
        {
          id: '2',
          type: 'payment',
          title: 'Pagamento Recebido',
          message: 'Pagamento de R$ 2.500,00 referente ao evento de João Santos foi confirmado.',
          timestamp: '2024-03-10T09:15:00Z',
          isRead: false,
          priority: 'medium'
        },
        {
          id: '3',
          type: 'message',
          title: 'Nova Mensagem',
          message: 'Ana Costa enviou uma mensagem sobre o evento de formatura.',
          timestamp: '2024-03-09T16:45:00Z',
          isRead: true,
          priority: 'medium',
          actionUrl: '/collaborator/messages/456'
        },
        {
          id: '4',
          type: 'system',
          title: 'Atualização do Sistema',
          message: 'Nova versão disponível com melhorias na agenda.',
          timestamp: '2024-03-09T08:00:00Z',
          isRead: true,
          priority: 'low'
        },
      ]);

      setSettings({
        email: {
          newBookings: true,
          paymentReceived: true,
          messageReceived: true,
          systemUpdates: false
        },
        push: {
          newBookings: true,
          paymentReceived: true,
          messageReceived: true,
          systemUpdates: true
        },
        sms: {
          newBookings: true,
          paymentReceived: false
        },
        preferences: {
          quietHours: {
            enabled: true,
            start: '22:00',
            end: '08:00'
          },
          frequency: 'immediate'
        }
      });

      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true }))
    );
  };

  const handleDeleteNotification = (notificationId: string) => {
    setNotifications(prev =>
      prev.filter(n => n.id !== notificationId)
    );
  };

  const handleSettingsChange = (category: keyof NotificationSettings, setting: string, value: boolean | string | object) => {
    if (!settings) return;
    
    setSettings(prev => ({
      ...prev!,
      [category]: {
        ...prev![category],
        [setting]: value
      }
    }));
  };

  const filteredNotifications = notifications
    .filter(n => {
      if (filter === 'read') return n.isRead;
      if (filter === 'unread') return !n.isRead;
      return true;
    })
    .filter(n => {
      if (typeFilter === 'all') return true;
      return n.type === typeFilter;
    })
    .filter(n => {
      if (!searchTerm) return true;
      return n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
             n.message.toLowerCase().includes(searchTerm.toLowerCase());
    });

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'booking': return <Calendar className="h-5 w-5" />;
      case 'payment': return <Check className="h-5 w-5" />;
      case 'message': return <MessageSquare className="h-5 w-5" />;
      case 'system': return <Settings className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Agora há pouco';
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays === 1) return 'Ontem';
    return `${diffDays} dias atrás`;
  };

  if (loading) {
    return (
      <CollaboratorLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando notificações...</p>
          </div>
        </div>
      </CollaboratorLayout>
    );
  }

  return (
    <CollaboratorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notificações</h1>
            <p className="text-muted-foreground">
              Gerencie suas notificações e preferências de comunicação
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                <Check className="h-4 w-4" />
                <span>Marcar todas como lidas</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notifications'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span>Notificações</span>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {unreadCount}
                  </span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Configurações</span>
              </div>
            </button>
          </nav>
        </div>

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            {/* Filtros e Busca */}
            <SimpleCard title="Filtros">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar notificações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border rounded-md"
                  />
                </div>
                
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as typeof filter)}
                  className="px-3 py-2 border rounded-md"
                  aria-label="Filtrar por status de leitura"
                >
                  <option value="all">Todas</option>
                  <option value="unread">Não lidas</option>
                  <option value="read">Lidas</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                  className="px-3 py-2 border rounded-md"
                  aria-label="Filtrar por tipo"
                >
                  <option value="all">Todos os tipos</option>
                  <option value="booking">Agendamentos</option>
                  <option value="payment">Pagamentos</option>
                  <option value="message">Mensagens</option>
                  <option value="system">Sistema</option>
                </select>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {filteredNotifications.length} notificação(ões)
                  </span>
                  <button
                    className="p-2 text-muted-foreground hover:bg-muted rounded-md"
                    aria-label="Configurações de filtro"
                  >
                    <Filter className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </SimpleCard>

            {/* Lista de Notificações */}
            <SimpleCard title="Notificações Recentes">
              <div className="space-y-3">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma notificação encontrada</p>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`border-l-4 p-4 rounded-lg transition-colors ${
                        notification.isRead ? 'bg-muted/30' : 'bg-background'
                      } ${getPriorityColor(notification.priority)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`p-2 rounded-lg ${
                            notification.type === 'booking' ? 'bg-blue-100 text-blue-600' :
                            notification.type === 'payment' ? 'bg-green-100 text-green-600' :
                            notification.type === 'message' ? 'bg-purple-100 text-purple-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className={`font-medium ${
                                notification.isRead ? 'text-muted-foreground' : 'text-foreground'
                              }`}>
                                {notification.title}
                              </h3>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                              )}
                            </div>
                            
                            <p className={`text-sm ${
                              notification.isRead ? 'text-muted-foreground' : 'text-foreground'
                            }`}>
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(notification.timestamp)}
                              </span>
                              
                              <span className={`text-xs px-2 py-1 rounded ${
                                notification.priority === 'high' ? 'bg-red-100 text-red-700' :
                                notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {notification.priority === 'high' ? 'Alta' :
                                 notification.priority === 'medium' ? 'Média' : 'Baixa'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {!notification.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                              aria-label="Marcar como lida"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            aria-label="Excluir notificação"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      {notification.actionUrl && (
                        <div className="mt-3">
                          <button className="text-sm text-primary hover:underline">
                            Ver detalhes →
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </SimpleCard>
          </div>
        )}

        {activeTab === 'settings' && settings && (
          <div className="space-y-6">
            {/* Configurações de E-mail */}
            <SimpleCard title="Notificações por E-mail">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Novos Agendamentos</p>
                      <p className="text-sm text-muted-foreground">Receber e-mail quando houver novos agendamentos</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.email.newBookings}
                      onChange={(e) => handleSettingsChange('email', 'newBookings', e.target.checked)}
                      className="sr-only peer"
                      aria-label="Ativar notificações de novos agendamentos por e-mail"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Pagamentos Recebidos</p>
                      <p className="text-sm text-muted-foreground">Confirmação de pagamentos por e-mail</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.email.paymentReceived}
                      onChange={(e) => handleSettingsChange('email', 'paymentReceived', e.target.checked)}
                      className="sr-only peer"
                      aria-label="Ativar notificações de pagamentos recebidos por e-mail"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Novas Mensagens</p>
                      <p className="text-sm text-muted-foreground">Notificação de mensagens de clientes</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.email.messageReceived}
                      onChange={(e) => handleSettingsChange('email', 'messageReceived', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </SimpleCard>

            {/* Configurações Push */}
            <SimpleCard title="Notificações Push">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Receba notificações instantâneas no seu dispositivo
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm font-medium">Novos Agendamentos</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.push.newBookings}
                        onChange={(e) => handleSettingsChange('push', 'newBookings', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm font-medium">Pagamentos</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.push.paymentReceived}
                        onChange={(e) => handleSettingsChange('push', 'paymentReceived', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm font-medium">Mensagens</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.push.messageReceived}
                        onChange={(e) => handleSettingsChange('push', 'messageReceived', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm font-medium">Sistema</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.push.systemUpdates}
                        onChange={(e) => handleSettingsChange('push', 'systemUpdates', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            </SimpleCard>

            {/* Horário Silencioso */}
            <SimpleCard title="Horário Silencioso">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Volume2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Ativar Horário Silencioso</p>
                    <p className="text-sm text-muted-foreground">
                      Pausar notificações durante determinado período
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={settings.preferences.quietHours.enabled}
                      onChange={(e) => handleSettingsChange('preferences', 'quietHours', {
                        ...settings.preferences.quietHours,
                        enabled: e.target.checked
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {settings.preferences.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Início</label>
                      <input
                        type="time"
                        value={settings.preferences.quietHours.start}
                        onChange={(e) => handleSettingsChange('preferences', 'quietHours', {
                          ...settings.preferences.quietHours,
                          start: e.target.value
                        })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Fim</label>
                      <input
                        type="time"
                        value={settings.preferences.quietHours.end}
                        onChange={(e) => handleSettingsChange('preferences', 'quietHours', {
                          ...settings.preferences.quietHours,
                          end: e.target.value
                        })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  </div>
                )}
              </div>
            </SimpleCard>

            {/* Frequência */}
            <SimpleCard title="Frequência de Notificações">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Escolha com que frequência deseja receber notificações agrupadas
                </p>
                
                <select
                  value={settings.preferences.frequency}
                  onChange={(e) => handleSettingsChange('preferences', 'frequency', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  aria-label="Frequência de notificações"
                >
                  <option value="immediate">Imediato</option>
                  <option value="hourly">A cada hora</option>
                  <option value="daily">Diário</option>
                </select>
              </div>
            </SimpleCard>
          </div>
        )}
      </div>
    </CollaboratorLayout>
  );
};

export default CollaboratorNotificationsPage;