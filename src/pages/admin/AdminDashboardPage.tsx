import { ReceitaMensalChart } from '../../components/ReceitaMensalChart';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatsCard, SimpleCard } from '../../components/ui/Cards';
import type { AdminDashboardStats, Activity, BookingListItem } from '../../types/types';

// Função utilitária para formatar valores monetários
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Função utilitária para formatar data relativa
const formatRelativeTime = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

  if (diffInSeconds < 60) return 'há poucos segundos';
  if (diffInSeconds < 3600) return `há ${Math.floor(diffInSeconds / 60)} minutos`;
  if (diffInSeconds < 86400) return `há ${Math.floor(diffInSeconds / 3600)} horas`;
  return `há ${Math.floor(diffInSeconds / 86400)} dias`;
};

// Ícones

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const CurrencyIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
    />
  </svg>
);

const CameraIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
    />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

// StarIcon removido: não exibimos avaliações de colaboradores

const AnalyticsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const EquipmentIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

// Componente de Atividade Recente
const RecentActivity = ({ activities }: { activities: Activity[] }) => {
  const navigate = useNavigate();
  return (
  <SimpleCard title="Atividade Recente">
      <div className="space-y-3">
        {activities.length > 0 ? (
          activities.slice(0, 4).map((activity, index) => {
            const isClickable = activity.type === 'booking' && activity.id;
            const goTo = () => {
              if (activity.type === 'booking' && activity.id) {
                navigate(`/admin/bookings/${activity.id}`);
              }
            };
            return (
              <div
                key={activity.id || index}
                {...(isClickable ? { role: 'button', tabIndex: 0, onClick: goTo, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(); } } } : {})}
                className={`flex items-start space-x-3 p-2 rounded-lg transition-colors ${
                  isClickable ? 'hover:bg-muted/50 cursor-pointer' : 'hover:bg-muted/30'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    activity.type === 'booking' ? 'bg-primary' : 'bg-warning'
                  }`}
                ></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {activity.title || activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {activity.description}
                  </p>
                  {activity.amount && (
                    <p className="text-xs text-success font-medium">
                      {formatCurrency(activity.amount)}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(new Date(activity.timestamp || activity.createdAt || ''))}
                    </p>
                    {activity.status && (
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          activity.status === 'COMPLETED'
                            ? 'bg-success/10 text-success'
                            : activity.status === 'PENDING'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-info/10 text-info'
                        }`}
                      >
                        {activity.status}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma atividade recente
          </p>
        )}
      </div>
      <div className="mt-4 text-right">
        <button
          onClick={() => navigate('/admin/bookings')}
          className="text-sm text-primary hover:underline"
        >
          Ver todas as reservas
        </button>
      </div>
    </SimpleCard>
  );
};

// Componente de Performance
const PerformanceOverview = ({ stats }: { stats: AdminDashboardStats | null }) => {
  return (
    <SimpleCard title="Performance Overview">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Taxa de Confirmação
          </span>
          <div className="flex items-center space-x-3">
            <div className="w-24">
              <progress
                className="progress progress-green"
                value={Math.min(
                  (stats?.confirmedBookings || 0) / Math.max(stats?.totalBookings || 1, 1) * 100,
                  100
                )}
                max={100}
                aria-label="Taxa de confirmação"
              />
            </div>
            <span className="text-sm font-bold text-foreground min-w-[3rem] text-right">
              {Math.round(
                ((stats?.confirmedBookings || 0) / Math.max(stats?.totalBookings || 1, 1)) * 100
              )}%
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Taxa de Conclusão
          </span>
          <div className="flex items-center space-x-3">
            <div className="w-24">
              <progress
                className="progress progress-blue"
                value={Math.min(
                  (stats?.completedBookings || 0) / Math.max(stats?.totalBookings || 1, 1) * 100,
                  100
                )}
                max={100}
                aria-label="Taxa de conclusão"
              />
            </div>
            <span className="text-sm font-bold text-foreground min-w-[3rem] text-right">
              {Math.round(
                ((stats?.completedBookings || 0) / Math.max(stats?.totalBookings || 1, 1)) * 100
              )}%
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Colaboradores Ativos
          </span>
          <div className="flex items-center space-x-3">
            <div className="w-24">
              <progress
                className="progress progress-purple"
                value={Math.min((stats?.activeCollaborators || 0) * 10, 100)}
                max={100}
                aria-label="Colaboradores ativos"
              />
            </div>
            <span className="text-sm font-bold text-foreground min-w-[3rem] text-right">
              {stats?.activeCollaborators || 0}
            </span>
          </div>
        </div>
      </div>
  </SimpleCard>
  );
};

// Bloco de colaboradores com avaliações removido por política: colaboradores não têm avaliações

export const AdminDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveStats, setLiveStats] = useState<{ todayBookings: number; todayRevenue: number; activeUsers: number } | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [nextBookings, setNextBookings] = useState<BookingListItem[]>([]);
  const [loadingNext, setLoadingNext] = useState<boolean>(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await apiFetch('/dashboard/stats') as AdminDashboardStats;
        setStats(response);
        // Buscar atividades recentes
        const acts = await apiFetch('/dashboard/recent-activities') as Activity[];
        setActivities(acts);
        // Buscar reservas para próximos eventos
        try {
          setLoadingNext(true);
          const resp: any = await apiFetch('/admin/bookings');
          const all = Array.isArray(resp) ? resp : Array.isArray(resp?.data) ? resp.data : [];
          const now = new Date();
          const upcoming = all
            .filter((b: BookingListItem) => {
              if (!b?.eventDate) return false;
              const d = new Date(b.eventDate);
              return !isNaN(d.getTime()) && d >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
            })
            .sort((a: BookingListItem, b: BookingListItem) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
            .slice(0, 5);
          setNextBookings(upcoming);
        } catch (e) {
          setNextBookings([]);
        } finally {
          setLoadingNext(false);
        }
        // Live stats do dia
        try {
          const ls = await apiFetch('/dashboard/live-stats') as { todayBookings: number; todayRevenue: number; activeUsers: number };
          setLiveStats(ls);
        } catch {}
        // Notificações (para possível badge futuro)
        try {
          const notifs = await apiFetch('/dashboard/notifications') as Array<{ id: string; read?: boolean }>;
          setUnreadNotifications((notifs || []).filter(n => !n.read).length);
        } catch {}
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Dashboard Administrativo" breadcrumbs={[{ name: 'Admin' }, { name: 'Dashboard' }]}>
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard Administrativo" breadcrumbs={[{ name: 'Admin' }, { name: 'Dashboard' }]}>
      <div className="space-y-8">
        {/* Header de boas-vindas */}
    <div className="bg-gradient-to-r from-primary to-secondary rounded-xl text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                Bem-vindo de volta, {user?.name}!
              </h1>
      <p className="text-white/80">Aqui está um resumo das suas atividades recentes</p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span>Sistema Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total de Clientes"
            value={stats?.totalClients || 0}
            icon={<UsersIcon />}
            description="Clientes cadastrados"
            onClick={() => navigate('/admin/clients')}
          />
          <StatsCard
            title="Reservas Ativas"
            value={stats?.confirmedBookings || 0}
            icon={<CalendarIcon />}
            description="Reservas confirmadas"
            onClick={() => navigate('/admin/bookings')}
            {...(typeof stats?.bookingsGrowth === 'number'
              ? {
                  trend: {
                    value: stats.bookingsGrowth,
                    type:
                      stats.bookingsGrowth > 0
                        ? 'positive'
                        : stats.bookingsGrowth < 0
                        ? 'negative'
                        : 'neutral',
                  },
                }
              : {})}
          />
          <StatsCard
            title="Receita Total"
            value={formatCurrency(stats?.totalRevenue || 0)}
            icon={<CurrencyIcon />}
            description="Receita acumulada"
            onClick={() => navigate('/admin/performance')}
            {...(typeof stats?.revenueGrowth === 'number'
              ? {
                  trend: {
                    value: stats.revenueGrowth,
                    type:
                      stats.revenueGrowth > 0
                        ? 'positive'
                        : stats.revenueGrowth < 0
                        ? 'negative'
                        : 'neutral',
                  },
                }
              : {})}
          />
          <StatsCard
            title="Equipamentos"
            value={stats?.totalEquipments || 0}
            icon={<CameraIcon />}
            description="Equipamentos disponíveis"
            onClick={() => navigate('/admin/equipment')}
          />
        </div>

        {/* Gráfico de receita mensal */}
        <SimpleCard title="Receita Mensal">
          <div className="mt-2">
            <ReceitaMensalChart year={new Date().getFullYear()} />
          </div>
        </SimpleCard>

        {/* Grid de conteúdo secundário */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Atividade Recente */}
          <div className="lg:col-span-1">
          <RecentActivity activities={activities} />
          </div>

          {/* Performance Overview */}
          <div className="lg:col-span-1">
            <PerformanceOverview stats={stats} />
          </div>
        </div>

        {/* Ações rápidas */}
  <SimpleCard title="Ações Rápidas">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <button
              onClick={() => navigate('/admin/clients')}
              className="relative p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg hover:shadow-md transition-all duration-200 text-left group border border-primary/20"
            >
              <UsersIcon />
              <h4 className="font-semibold text-primary mt-2 group-hover:text-primary/80">
                Clientes
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Gerenciar clientes
              </p>
            </button>

            <button
              onClick={() => navigate('/admin/bookings')}
              className="relative p-4 bg-gradient-to-br from-success/10 to-success/20 rounded-lg hover:shadow-md transition-all duration-200 text-left group border border-success/20"
            >
              <CalendarIcon />
              <h4 className="font-semibold text-success mt-2 group-hover:text-success/80">
                Reservas
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Gerenciar reservas
              </p>
              {/* Badge de pendências/hoje */}
              {((stats?.pendingBookings || 0) > 0 || (liveStats?.todayBookings || 0) > 0) && (
                <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-success/20 text-success border border-success/30">
                  {(stats?.pendingBookings || 0) > 0 ? stats?.pendingBookings : liveStats?.todayBookings}
                </span>
              )}
              {/* Indicador de notificações não lidas */}
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full border border-card" aria-label={`${unreadNotifications} notificações não lidas`}></span>
              )}
            </button>

            <button
              onClick={() => navigate('/admin/equipment')}
              className="relative p-4 bg-gradient-to-br from-secondary/10 to-secondary/20 rounded-lg hover:shadow-md transition-all duration-200 text-left group border border-secondary/20"
            >
              <EquipmentIcon />
              <h4 className="font-semibold text-secondary mt-2 group-hover:text-secondary/80">
                Equipamentos
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Catálogo de equipamentos
              </p>
            </button>

            <button
              onClick={() => navigate('/admin/performance')}
              className="relative p-4 bg-gradient-to-br from-warning/10 to-warning/20 rounded-lg hover:shadow-md transition-all duration-200 text-left group border border-warning/20"
            >
              <AnalyticsIcon />
              <h4 className="font-semibold text-warning mt-2 group-hover:text-warning/80">
                Performance
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Relatórios e métricas
              </p>
              {/* Badge receita do dia */}
              {typeof liveStats?.todayRevenue === 'number' && liveStats.todayRevenue > 0 && (
                <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-warning/20 text-warning border border-warning/30">
                  {formatCurrency(liveStats.todayRevenue)}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate('/admin/collaborators')}
              className="p-4 bg-gradient-to-br from-info/10 to-info/20 rounded-lg hover:shadow-md transition-all duration-200 text-left group border border-info/20"
            >
              <UsersIcon />
              <h4 className="font-semibold text-info mt-2 group-hover:text-info/80">
                Colaboradores
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Equipe e parceiros
              </p>
            </button>

            <button
              onClick={() => navigate('/admin/settings/logo')}
              className="p-4 bg-gradient-to-br from-muted/50 to-muted/80 rounded-lg hover:shadow-md transition-all duration-200 text-left group border border-border"
            >
              <SettingsIcon />
              <h4 className="font-semibold text-muted-foreground mt-2 group-hover:text-foreground">Logo e Marca</h4>
              <p className="text-xs text-muted-foreground mt-1">Identidade visual</p>
            </button>

            {/* Nova Reserva */}
            <button
              onClick={() => navigate('/admin/bookings/new')}
              className="p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg hover:shadow-md transition-all duration-200 text-left group border border-primary/20"
            >
              <PlusIcon />
              <h4 className="font-semibold text-primary mt-2 group-hover:text-primary/80">
                Nova Reserva
              </h4>
              <p className="text-xs text-muted-foreground mt-1">Criar agendamento</p>
            </button>

            {/* Calendário de Reservas */}
            <button
              onClick={() => navigate('/admin/bookings/calendar')}
              className="p-4 bg-gradient-to-br from-secondary/10 to-secondary/20 rounded-lg hover:shadow-md transition-all duration-200 text-left group border border-secondary/20"
            >
              <CalendarIcon />
              <h4 className="font-semibold text-secondary mt-2 group-hover:text-secondary/80">
                Calendário
              </h4>
              <p className="text-xs text-muted-foreground mt-1">Agenda de reservas</p>
            </button>
          </div>
  </SimpleCard>

        {/* Próximos eventos */}
        <SimpleCard
          title="Próximos eventos"
          headerRight={
            <button
              onClick={() => navigate('/admin/bookings/calendar')}
              className="text-sm text-primary hover:underline"
            >
              Ver calendário
            </button>
          }
        >
          {loadingNext ? (
            <div className="flex items-center justify-center py-10"><LoadingSpinner /></div>
          ) : nextBookings.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6">Nenhum evento agendado para os próximos dias.</div>
          ) : (
            <ul className="divide-y divide-border">
              {nextBookings.map((b) => {
                const d = new Date(b.eventDate);
                const dateStr = !isNaN(d.getTime())
                  ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'Data inválida';
                const statusClass = b.status === 'CONFIRMED'
                  ? 'bg-success/10 text-success'
                  : b.status === 'PENDING'
                  ? 'bg-warning/10 text-warning'
                  : 'bg-info/10 text-info';
                return (
                  <li key={b.id} className="py-3">
                    <button
                      onClick={() => navigate(`/admin/bookings/${b.id}`)}
                      className="w-full text-left flex items-center justify-between gap-4 hover:bg-muted/40 p-2 rounded-lg transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {b.eventTitle || b.client?.user?.name || 'Reserva'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {dateStr} • ID: {b.id.slice(0, 8)}...
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                        {b.status}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </SimpleCard>
      </div>
    </AdminLayout>
  );
};
