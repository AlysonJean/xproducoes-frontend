import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  MessageSquare,
  Calendar,
  Settings,
  Check,
  Search,
  X,
} from 'lucide-react';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { CollaboratorLoading, CollaboratorError } from '../../components/collaborator/CollaboratorStates';
import { SimpleCard } from '../../components/ui/Cards';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { collaboratorProfileAPI } from '../../services/api';
import { logger } from '../../utils/logger';
import { cn } from '../../utils/cn';

interface Notification {
  id: string;
  type: 'booking' | 'payment' | 'message' | 'system';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  important: boolean;
  actionUrl?: string;
}

interface RawNotification {
  id: string;
  type?: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  important?: boolean;
  actionUrl?: string;
}

const BREADCRUMBS = [
  { name: 'Colaborador', href: '/colaborador/painel' },
  { name: 'Notificações' },
];

const READ_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'unread', label: 'Não lidas' },
  { value: 'read', label: 'Lidas' },
];

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'booking', label: 'Agendamentos' },
  { value: 'payment', label: 'Pagamentos' },
  { value: 'message', label: 'Mensagens' },
  { value: 'system', label: 'Sistema' },
];

// O backend manda o enum NotificationType (BOOKING_CREATED, PAYMENT_DUE, MESSAGE_RECEIVED…). Antes o
// tipo era só passado para minúsculas ("booking_created") e nunca batia com as categorias da tela:
// todo filtro por tipo vinha vazio e todo item tinha o ícone de "sistema".
const categoryOf = (type?: string): Notification['type'] => {
  const t = (type || '').toUpperCase();
  if (t.startsWith('BOOKING_')) return 'booking';
  if (t.startsWith('PAYMENT_') || t === 'REFERRAL_REWARD') return 'payment';
  if (t.startsWith('MESSAGE_')) return 'message';
  return 'system';
};

const TYPE_STYLE: Record<Notification['type'], { icon: React.ReactNode; tile: string }> = {
  booking: { icon: <Calendar className="h-5 w-5" aria-hidden="true" />, tile: 'bg-primary/10 text-primary' },
  payment: { icon: <Check className="h-5 w-5" aria-hidden="true" />, tile: 'bg-success/10 text-success' },
  message: { icon: <MessageSquare className="h-5 w-5" aria-hidden="true" />, tile: 'bg-info/10 text-info' },
  system: { icon: <Settings className="h-5 w-5" aria-hidden="true" />, tile: 'bg-muted text-muted-foreground' },
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

// Achado (auditoria): a página tinha uma aba "Configurações" com preferências inventadas (valores
// fixos no código, sem salvar em lugar nenhum) e ações "marcar como lida", "excluir" e "marcar todas"
// que só mudavam o estado local — tudo voltava ao recarregar. Não há endpoint para nenhuma delas,
// então foram retiradas; a lista mostra o estado real (lida/não lida) vindo do backend.
const CollaboratorNotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'booking' | 'payment' | 'message' | 'system'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await collaboratorProfileAPI.getMyNotifications();
      const loadedNotifications = (response.data?.data ?? response.data ?? []) as RawNotification[];

      const mapped = Array.isArray(loadedNotifications) ? loadedNotifications.map((n): Notification => ({
        id: n.id,
        type: categoryOf(n.type),
        title: n.title,
        message: n.message,
        timestamp: n.createdAt,
        isRead: n.read,
        important: !!n.important,
        actionUrl: n.actionUrl
      })) : [];

      setNotifications(mapped);
    } catch (err) {
      logger.error('Erro ao carregar notificações:', 'CollaboratorNotificationsPage', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const hasFilters = filter !== 'all' || typeFilter !== 'all' || searchTerm !== '';

  const filteredNotifications = notifications
    .filter(n => {
      if (filter === 'read') return n.isRead;
      if (filter === 'unread') return !n.isRead;
      return true;
    })
    .filter(n => typeFilter === 'all' || n.type === typeFilter)
    .filter(n => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return n.title.toLowerCase().includes(term) || n.message.toLowerCase().includes(term);
    });

  return (
    <CollaboratorLayout title="Notificações" breadcrumbs={BREADCRUMBS}>
      {loading ? (
        <CollaboratorLoading label="Carregando notificações…" />
      ) : error ? (
        <CollaboratorError message="Não conseguimos carregar suas notificações." onRetry={loadNotifications} />
      ) : (
        <div className="space-y-6">
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `Você tem ${unreadCount} notificaç${unreadCount === 1 ? 'ão não lida' : 'ões não lidas'}.`
              : 'Você está em dia com suas notificações.'}
          </p>

          {/* Filtros e busca */}
          <SimpleCard title="Filtros">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:items-end">
              <Input
                size="sm"
                label="Buscar"
                placeholder="Título ou mensagem"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />

              <Select
                size="sm"
                label="Leitura"
                options={READ_FILTER_OPTIONS}
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
              />

              <Select
                size="sm"
                label="Tipo"
                options={TYPE_FILTER_OPTIONS}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              />

              <div className="flex items-center justify-between gap-2 md:h-10">
                <span className="text-sm text-muted-foreground" aria-live="polite">
                  {filteredNotifications.length} notificaç{filteredNotifications.length === 1 ? 'ão' : 'ões'}
                </span>
                {hasFilters && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setFilter('all'); setTypeFilter('all'); setSearchTerm(''); }}
                    leftIcon={<X className="h-4 w-4" />}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </SimpleCard>

          {/* Lista de notificações */}
          <SimpleCard title="Notificações recentes">
            <div className="space-y-3">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                  <p className="text-muted-foreground">
                    {notifications.length === 0 ? 'Você ainda não recebeu notificações.' : 'Nenhuma notificação com esses filtros.'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notification) => {
                  const style = TYPE_STYLE[notification.type] ?? TYPE_STYLE.system;
                  return (
                    <article
                      key={notification.id}
                      className={cn(
                        'rounded-lg border border-border border-l-4 p-4 transition-colors',
                        notification.isRead ? 'bg-muted/30 border-l-border' : 'bg-card border-l-primary'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('shrink-0 p-2 rounded-lg', style.tile)}>
                          {style.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className={cn('font-medium', notification.isRead ? 'text-muted-foreground' : 'text-foreground')}>
                              {notification.title}
                            </h3>
                            {!notification.isRead && (
                              <span className="w-2 h-2 bg-primary rounded-full" aria-label="Não lida" role="img" />
                            )}
                            {notification.important && <Badge variant="destructive" size="sm">Importante</Badge>}
                          </div>

                          <p className={cn('text-sm', notification.isRead ? 'text-muted-foreground' : 'text-foreground')}>
                            {notification.message}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            {notification.actionUrl && (
                              <Link
                                to={notification.actionUrl}
                                className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                              >
                                Ver detalhes →
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </SimpleCard>
        </div>
      )}
    </CollaboratorLayout>
  );
};

export default CollaboratorNotificationsPage;
