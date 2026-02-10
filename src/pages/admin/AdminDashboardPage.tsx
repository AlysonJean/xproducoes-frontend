import { ReceitaMensalChart } from '../../components/ReceitaMensalChart';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatsCard, SimpleCard } from '../../components/ui/Cards';
import { QuickActionCard } from '../../components/ui/QuickActionCard';
import type { AdminDashboardStats, Activity, AdminNotification } from '../../types/domains/dashboard';
import type { BookingListItem } from '../../types/types';
import { Skeleton, SkeletonCard, SkeletonList } from '../../components/ui/Skeleton';

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
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} role="img" aria-hidden="true">
    <title>Ícone de Usuários</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} role="img" aria-hidden="true">
    <title>Ícone de Calendário</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
    />
  </svg>
);

const CurrencyIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} role="img" aria-hidden="true">
    <title>Ícone de Receita</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CameraIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} role="img" aria-hidden="true">
    <title>Ícone de Equipamento</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} role="img" aria-hidden="true">
    <title>Ícone Mais</title>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} role="img" aria-hidden="true">
    <title>Ícone de Análise</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);

const EquipmentIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} role="img" aria-hidden="true">
    <title>Ícone de Ferramentas</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486L21.75 6.75z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 15.75L3 12l5.25-5.25" />
  </svg>
);

// Componente de Atividade Recente
const RecentActivity = ({ activities, loading }: { activities: Activity[], loading: boolean }) => {
  const navigate = useNavigate();
  return (
  <SimpleCard title="Atividade Recente">
      <div className="space-y-3">
        {loading ? (
          <SkeletonList items={4} />
        ) : activities.length > 0 ? (
          activities.slice(0, 4).map((activity, index) => {
            const isClickable = activity.type === 'booking' && activity.id;
            const goTo = () => {
              if (activity.type === 'booking' && activity.id) {
                navigate(`/admin/reservas/${activity.id}`);
              }
            };
            return (
              <div
                key={activity.id || index}
                {...(isClickable ? { 
                  role: 'button', 
                  tabIndex: 0, 
                  onClick: goTo, 
                  'aria-label': `Ver detalhes da reserva: ${activity.title || activity.description}`,
                  onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(); } } 
                } : {})}
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
          onClick={() => navigate('/admin/reservas')}
          className="text-sm text-primary hover:underline"
        >
          Ver todas as reservas
        </button>
      </div>
    </SimpleCard>
  );
};

// Componente de Performance
const PerformanceOverview = ({ stats, loading }: { stats: AdminDashboardStats | null, loading: boolean }) => {
  return (
    <SimpleCard title="Performance Overview">
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-6">
            <div className="space-y-2"><Skeleton width="40%" height={14} /><Skeleton width="100%" height={8} /></div>
            <div className="space-y-2"><Skeleton width="40%" height={14} /><Skeleton width="100%" height={8} /></div>
            <div className="space-y-2"><Skeleton width="40%" height={14} /><Skeleton width="100%" height={8} /></div>
          </div>
        ) : (
          <>
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
                Eficiência da Equipe
              </span>
              <div className="flex items-center space-x-3">
                <div className="w-24">
                  <progress
                    className="progress progress-signal"
                    value={Math.min((stats?.activeCollaborators || 0) * 10, 100)}
                    max={100}
                    aria-label="Eficiência da equipe"
                  />
                </div>
                <span className="text-sm font-bold text-foreground min-w-[3rem] text-right">
                  {stats?.activeCollaborators || 0}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
  </SimpleCard>
  );
};

export const AdminDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveStats, setLiveStats] = useState<{ todayBookings: number; todayRevenue: number; activeUsers: number } | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [nextBookings, setNextBookings] = useState<BookingListItem[]>([]);
  const [loadingNext, setLoadingNext] = useState<boolean>(true);
  const [topEquipment, setTopEquipment] = useState<{ name: string; bookings: number }[]>([]);
  const [topCollaborators, setTopCollaborators] = useState<{
    collaborator: { id: string; name: string; role: string };
    rating: number;
    eventCount: number;
  }[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsRes, actsRes, liveRes, notifsRes, equipRes, collabRes] = await Promise.all([
          apiFetch<AdminDashboardStats>('/dashboard/stats'),
          apiFetch<Activity[]>('/dashboard/recent-activities'),
          apiFetch<{ todayBookings: number; todayRevenue: number; activeUsers: number }>('/dashboard/live-stats'),
          apiFetch<AdminNotification[]>('/dashboard/notifications'),
          apiFetch<{ name: string; bookings: number }[]>('/dashboard/top-equipment'),
          apiFetch<{ collaborator: { id: string; name: string; role: string }; rating: number; eventCount: number }[]>('/dashboard/top-collaborators')
        ]);

        setStats(statsRes);
        setActivities(actsRes);
        setLiveStats(liveRes);
        setUnreadNotifications((notifsRes || []).filter(n => !n.read).length);
        setTopEquipment(equipRes || []);
        setTopCollaborators(collabRes || []);

        // Buscar reservas para próximos eventos (mantido separado por ser opcional/pesado)
        try {
          const resp = await apiFetch<BookingListItem[] | { data: BookingListItem[] }>('/admin/bookings');
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
        } catch {
          setNextBookings([]);
        } finally {
          setLoadingNext(false);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        addNotification({
          type: 'error',
          title: 'Erro de Carregamento',
          message: 'Não foi possível carregar os dados do dashboard.',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [addNotification, navigate]);

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

        {/* Métricas principais / Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <StatsCard
                title="Total de Clientes"
                value={stats?.totalClients || 0}
                icon={<UsersIcon />}
                description="Clientes cadastrados"
                onClick={() => navigate('/admin/clientes')}
              />
              <StatsCard
                title="Reservas Ativas"
                value={stats?.confirmedBookings || 0}
                icon={<CalendarIcon />}
                description="Reservas confirmadas"
                onClick={() => navigate('/admin/reservas')}
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
                onClick={() => navigate('/admin/equipamentos')}
              />
            </>
          )}
        </div>

        {/* Gráfico de receita mensal */}
        <SimpleCard title="Receita Mensal">
          {loading ? (
            <div className="h-64 flex items-end space-x-2 py-4 px-2">
              {[60, 40, 80, 50, 70, 90, 45, 65, 85, 55, 75, 95].map((h, i) => (
                <div 
                  key={i} 
                  className="chart-loading-bar" 
                  style={{ '--bar-h': `${h}%` } as React.CSSProperties}
                  data-height={h}
                ></div>
              ))}
            </div>
          ) : (
            <div className="mt-2">
              <ReceitaMensalChart year={new Date().getFullYear()} />
            </div>
          )}
        </SimpleCard>

        {/* Grid de conteúdo secundário */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Atividade Recente */}
          <div className="lg:col-span-1">
            <RecentActivity activities={activities} loading={loading} />
          </div>

          {/* Performance Overview & Integrations */}
          <div className="lg:col-span-1 space-y-6">
            <PerformanceOverview stats={stats} loading={loading} />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <SimpleCard title="Top Equipamentos">
                <div className="space-y-4">
                  {loading ? (
                    <SkeletonList items={3} />
                  ) : topEquipment.length > 0 ? (
                    topEquipment.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate pr-2" title={item.name}>{item.name}</span>
                        <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-full">
                          {item.bookings} reservas
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>
                  )}
                </div>
              </SimpleCard>

              <SimpleCard title="Top Colaboradores">
                <div className="space-y-4">
                  {loading ? (
                    <SkeletonList items={3} />
                  ) : topCollaborators.length > 0 ? (
                    topCollaborators.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.collaborator.name}</p>
                          <p className="text-[10px] text-muted-foreground">{item.collaborator.role}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-accent">★ {item.rating.toFixed(1)}</p>
                          <p className="text-[10px] text-muted-foreground">{item.eventCount} ev.</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>
                  )}
                </div>
              </SimpleCard>
            </div>
          </div>
        </div>

        {/* Quick Actions (Amostra / Placeholders reais) */}
        <SimpleCard title="Ações Rápidas">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <QuickActionCard
               title="Nova Reserva"
               description="Criar novo agendamento rápida"
               icon={<PlusIcon />}
               onClick={() => navigate('/admin/reservas/nova')}
               color="primary"
             />
             <QuickActionCard
               title="Relatórios"
               description="Ver estatísticas detalhadas"
               icon={<AnalyticsIcon />}
               onClick={() => navigate('/admin/relatorios')}
               color="secondary"
               badge={unreadNotifications > 0 ? { content: unreadNotifications, variant: 'destructive' } : undefined}
             />
             <QuickActionCard
               title="Gerenciar Estoque"
               description="Controlar equipamentos e kits"
               icon={<EquipmentIcon />}
               onClick={() => navigate('/admin/equipamentos')}
               color="info"
             />
             <QuickActionCard
               title="Monitorar Live"
               description={`${liveStats?.activeUsers || 0} usuários online agora`}
               icon={
                 <div className="relative">
                   <AnalyticsIcon />
                   {liveStats && liveStats.activeUsers > 0 && (
                     <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full border-2 border-card"></div>
                   )}
                 </div>
               }
               onClick={() => navigate('/admin/monitoramento')}
               color="destructive"
             />
           </div>
        </SimpleCard>

        {/* Próximas Reservas */}
        <SimpleCard title="Próximas Reservas">
          {loadingNext ? (
            <SkeletonList items={3} />
          ) : nextBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/40">
                    <th className="pb-3 font-medium">Cliente</th>
                    <th className="pb-3 font-medium">Data</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {nextBookings.map((booking: BookingListItem) => (
                    <tr key={booking.id} className="group hover:bg-muted/30 transition-colors">
                      <td className="py-4 font-medium">{booking.client?.user?.name || '---'}</td>
                      <td className="py-4">{new Date(booking.eventDate).toLocaleDateString()}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          booking.status === 'CONFIRMED' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => navigate(`/admin/reservas/${booking.id}`)}
                          className="text-primary opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-2 rounded-md hover:bg-primary/10"
                          aria-label={`Ver detalhes da reserva de ${booking.client?.user?.name || '---'}`}
                        >
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Nenhuma reserva futura encontrada</p>
          )}
        </SimpleCard>
      </div>
    </AdminLayout>
  );
};
