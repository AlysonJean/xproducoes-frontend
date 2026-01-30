import { ReceitaMensalChart } from '../../components/ReceitaMensalChart';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatsCard, SimpleCard } from '../../components/ui/Cards';
import { QuickActionCard } from '../../components/ui/QuickActionCard';
import type { AdminDashboardStats, Activity } from '../../types/domains/dashboard';
import type { BookingListItem } from '../../types/types';

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

// Ícones otimizados para cards
const UsersIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
    />
  </svg>
);

const CurrencyIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CameraIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);

const EquipmentIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486L21.75 6.75z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 15.75L3 12l5.25-5.25" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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

// Componente de Status das Integrações
const SystemIntegrations = () => {
  const gaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
  // Considera ativo se existir e não for o placeholder padrão
  const hasGa = !!gaId && gaId !== 'G-XXXXXXXXXX';

  return (
    <SimpleCard title="Integrações do Sistema">
      <div className="space-y-4">
        {/* Google Analytics 4 */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${hasGa ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-muted text-muted-foreground'}`}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.025.04c-2.88 0-2.88 2.65-2.88 2.65s0 .64-.49 1.5c-2.31 4.09-8.655 4.96-8.655 9.49 0 4.14 5.38 7.37 9.875 10.32 1.34-1.28 7.35-7.38 7.35-13.62 0-3.37-2.35-10.34-5.2-10.34z"/>
                <circle cx="12" cy="18" r="2" fill="white" fillOpacity="0.8"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Google Analytics 4</p>
              <p className="text-xs text-muted-foreground">
                {hasGa ? `ID: ${gaId}` : 'Integração pendente'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${hasGa ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
              {hasGa ? 'Online' : 'Inativo'}
            </span>
            {hasGa && (
              <a 
                href="https://analytics.google.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-primary hover:underline"
              >
                Ver Relatórios
              </a>
            )}
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
          const ls = await apiFetch('/api/dashboard/live-stats') as { todayBookings: number; todayRevenue: number; activeUsers: number };
          setLiveStats(ls);
        } catch {}
        // Notificações (para possível badge futuro)
        try {
          const notifs = await apiFetch('/api/dashboard/notifications') as Array<{ id: string; read?: boolean }>;
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

          {/* Performance Overview & Integrations */}
          <div className="lg:col-span-1 space-y-6">
            <PerformanceOverview stats={stats} />
            <SystemIntegrations />
          </div>
        </div>

        {/* Ações rápidas */}
        <SimpleCard title="Ações Rápidas" description="Acesso rápido às principais funcionalidades do sistema">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            <QuickActionCard
              title="Clientes"
              description="Gerenciar clientes cadastrados"
              icon={<UsersIcon />}
              onClick={() => navigate('/admin/clients')}
              color="primary"
            />

            <QuickActionCard
              title="Reservas"
              description="Gerenciar reservas e agendamentos"
              icon={<CalendarIcon />}
              onClick={() => navigate('/admin/bookings')}
              color="info"
              badge={
                ((stats?.pendingBookings || 0) > 0 || (liveStats?.todayBookings || 0) > 0)
                  ? {
                      content: (stats?.pendingBookings || 0) > 0 ? stats?.pendingBookings || 0 : liveStats?.todayBookings || 0,
                      variant: 'info'
                    }
                  : undefined
              }
              hasNotification={unreadNotifications > 0}
            />

            <QuickActionCard
              title="Equipamentos"
              description="Catálogo de equipamentos disponíveis"
              icon={<EquipmentIcon />}
              onClick={() => navigate('/admin/equipment')}
              color="success"
            />

            <QuickActionCard
              title="Monitoramento"
              description="Monitoramento Enterprise em tempo real"
              icon={<AnalyticsIcon />}
              onClick={() => navigate('/admin/monitoring')}
              color="warning"
              badge={
                (typeof liveStats?.todayRevenue === 'number' && liveStats.todayRevenue > 0)
                  ? {
                      content: formatCurrency(liveStats.todayRevenue),
                      variant: 'warning'
                    }
                  : undefined
              }
            />

            <QuickActionCard
              title="Colaboradores"
              description="Equipe e parceiros cadastrados"
              icon={<UsersIcon />}
              onClick={() => navigate('/admin/collaborators')}
              color="secondary"
            />

            <QuickActionCard
              title="Nova Reserva"
              description="Criar novo agendamento"
              icon={<PlusIcon />}
              onClick={() => navigate('/admin/bookings/new')}
              color="primary"
            />

            <QuickActionCard
              title="Calendário"
              description="Visualizar agenda de reservas"
              icon={<CalendarIcon />}
              onClick={() => navigate('/admin/bookings/calendar')}
              color="info"
            />

            <QuickActionCard
              title="Configurações"
              description="Logo, marca e configurações"
              icon={<SettingsIcon />}
              onClick={() => navigate('/admin/settings/logo')}
              color="muted"
            />
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
