import { ReceitaMensalChart } from '../../components/ReceitaMensalChart';
import { useState, useEffect, useCallback } from 'react';
import { GoogleCalendarIntegration } from '../../components/GoogleCalendarIntegration';

import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { fetchUpcomingAdminBookings } from '../../services/adminBookings';
import { bookingStatusLabel, bookingStatusVariant } from '../../utils/bookingStatus';
import { collaboratorRoleLabel } from '../../utils/collaboratorRoles';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { PendingRequestsCard } from '../../components/admin/PendingRequestsCard';
import { useAdminSummary } from '../../stores/adminSummary';
import {
  Users,
  Calendar,
  DollarSign,
  Camera,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowRight,
  Plus,
  Monitor,
  Package,
  Star,
  Clock,
  CheckCircle2,
  BarChart3,
  CreditCard,
  Target
} from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  Grid,
  Alert,
  Skeleton
} from '../../components/ui/StandardComponents';
import type { AdminDashboardStats, Activity as DashboardActivity } from '../../types/domains/dashboard';
import type { BookingListItem } from '../../types/types';
import { BrandLoader } from '../../components/ui/BrandLoader';
import { logger } from '../../utils/logger';

const PAGE_TITLE = 'Painel de Controle';
const BREADCRUMBS = [{ name: 'Admin', href: '/admin/painel' }, { name: 'Painel' }];

// Conferência de 07/11/2026: a frase dizia "Você tem N eventos programados para hoje", mas o número (todayBookings
// do /dashboard/live-stats) conta os pedidos FEITOS hoje: dois pedidos para dezembro apareceram como "2 eventos
// programados para hoje". A frase passa a dizer o que o número conta.
const TodayOrdersText = ({ count }: { count: number }) =>
  count === 0 ? (
    <>Nenhum pedido novo hoje.</>
  ) : (
    <>
      Você recebeu{' '}
      <span className="font-bold text-primary-foreground">{count === 1 ? '1 pedido novo' : `${count} pedidos novos`}</span>{' '}
      hoje.
    </>
  );

// Mapa literal de tons. Antes: `bg-${color}/10` com color="indigo"/"emerald"/"amber" — classe montada
// em tempo de execução (o Tailwind não gera) e sem tom de cor: os ícones dos cards ficavam sem cor.
type StatTone = 'primary' | 'success' | 'info' | 'warning';
const STAT_TONE: Record<StatTone, string> = {
  primary: 'bg-primary/10 border-primary/20 text-primary',
  success: 'bg-success/10 border-success/20 text-success',
  info: 'bg-info/10 border-info/20 text-info',
  warning: 'bg-warning/10 border-warning/20 text-warning',
};

// Componentes internos de apoio para manter o Dashboard conciso
const StatItem = ({
  title,
  value,
  icon: Icon,
  trend,
  description,
  tone = 'primary',
  onClick
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; type: 'positive' | 'negative' | 'neutral' };
  description?: string;
  tone?: StatTone;
  onClick?: () => void;
}) => {
  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-2xl border ${STAT_TONE[tone]}`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
            trend.type === 'positive' ? 'bg-success/10 text-success' :
            trend.type === 'negative' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
          }`}>
            {trend.type === 'positive' ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> :
             trend.type === 'negative' ? <TrendingDown className="h-3 w-3" aria-hidden="true" /> : null}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {description && <p className="text-sm text-muted-foreground mt-2">{description}</p>}
      </div>
    </>
  );
  const base = 'p-5 border border-border rounded-3xl bg-card text-left w-full transition-all duration-300';
  // Card clicável era <div onClick> (sem teclado); agora é botão.
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`${base} hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
    >
      {content}
    </button>
  ) : (
    <div className={base}>{content}</div>
  );
};

const formatActivityTime = (value?: string | Date) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const RecentActivityList = ({ activities, loading }: { activities: DashboardActivity[], loading: boolean }) => {
  const navigate = useNavigate();
  return (
    <Card className="flex flex-col h-full p-0 overflow-hidden">
      <div className="p-6 border-b border-border flex items-center justify-between gap-3 bg-muted/20">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" aria-hidden="true" /> Atividades recentes
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Últimas movimentações</p>
        </div>
        <Button variant="ghost" size="xs" onClick={() => navigate('/admin/reservas')} rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
          Ver tudo
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[400px] p-4 space-y-2">
        {loading ? (
             <div className="space-y-4" role="status" aria-label="Carregando atividades">
                 {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-start gap-4 p-3">
                       <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                       <div className="flex-1 space-y-2 py-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                       </div>
                    </div>
                 ))}
             </div>
        ) : activities.length > 0 ? (
          activities.slice(0, 10).map((activity, index) => {
            const isBooking = activity.type === 'booking' && !!activity.id;
            const inner = (
              <>
                <div className={`mt-1 p-1.5 rounded-lg shrink-0 ${
                  activity.type === 'booking' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'
                }`}>
                  {activity.type === 'booking' ? <Calendar className="h-3.5 w-3.5" aria-hidden="true" /> : <Activity className="h-3.5 w-3.5" aria-hidden="true" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground truncate">{activity.title || activity.description}</p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatActivityTime(activity.timestamp || activity.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{activity.description}</p>
                  {activity.amount && (
                    <p className="text-sm text-success font-semibold mt-1">
                      +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activity.amount)}
                    </p>
                  )}
                </div>
              </>
            );
            const rowClass = 'flex items-start gap-3 p-3 rounded-xl border border-transparent w-full text-left transition-colors';
            // Item clicável era <div onClick>; agora é botão.
            return isBooking ? (
              <button
                type="button"
                key={activity.id || index}
                onClick={() => navigate(`/admin/reservas/${activity.id}`)}
                className={`${rowClass} hover:bg-primary/5 hover:border-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                {inner}
              </button>
            ) : (
              <div key={activity.id || index} className={rowClass}>{inner}</div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
             <Activity className="h-10 w-10 mb-3" aria-hidden="true" />
             <p className="text-sm">Nenhuma atividade recente.</p>
          </div>
        )}
      </div>
    </Card>
  );
};

const EfficiencyStats = ({ stats, loading }: { stats: AdminDashboardStats | null, loading: boolean }) => (
  <Card className="p-6">
    <div className="flex items-center gap-2 mb-6">
      <Target className="h-4 w-4 text-primary" aria-hidden="true" />
      <h3 className="text-base font-bold text-foreground">Indicadores de reservas</h3>
    </div>
    <div className="space-y-6">
      {/* "Ocupação da Equipe" (colaboradores ativos × 8) saiu: era um número inventado. */}
      {[
        { label: 'Reservas confirmadas', value: stats ? Math.round(((stats.confirmedBookings || 0) / Math.max(stats.totalBookings || 1, 1)) * 100) : 0, color: 'bg-success', icon: CheckCircle2 },
        { label: 'Eventos concluídos', value: stats ? Math.round(((stats.completedBookings || 0) / Math.max(stats.totalBookings || 1, 1)) * 100) : 0, color: 'bg-info', icon: BarChart3 },
      ].map((item, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-1.5 text-muted-foreground">
               <item.icon className="h-3.5 w-3.5" aria-hidden="true" /> {item.label}
            </span>
            <span className="text-foreground">{item.value}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${item.color} transition-all duration-1000 ease-out ${loading ? 'w-0' : ''}`}
              {...(!loading ? { style: { width: `${item.value}%` } } : {})}
            />
          </div>
        </div>
      ))}
    </div>
  </Card>
);

export const AdminDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // P3: o mesmo resumo do número do menu (uma consulta só para os dois; stores/adminSummary).
  const pendingRequests = useAdminSummary(user?.role === 'ADMIN');
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveStats, setLiveStats] = useState<{ todayBookings: number; todayRevenue: number; activeUsers: number } | null>(null);
  // const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [nextBookings, setNextBookings] = useState<BookingListItem[]>([]);
  const [topEquipment, setTopEquipment] = useState<{ name: string; bookings: number }[]>([]);
  const [topCollaborators, setTopCollaborators] = useState<{
    collaborator: { id: string; name: string; role: string };
    rating: number;
    eventCount: number;
  }[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // /dashboard/notifications saiu daqui: a resposta era jogada fora (a tela não tem sino). A rota
      // continua no backend.
      const [statsRes, actsRes, liveRes, equipRes, collabRes] = await Promise.allSettled([
        apiFetch<AdminDashboardStats>('/dashboard/stats'),
        apiFetch<DashboardActivity[]>('/dashboard/recent-activities'),
        apiFetch<{ todayBookings: number; todayRevenue: number; activeUsers: number }>('/dashboard/live-stats'),
        apiFetch<{ name: string; bookings: number }[]>('/dashboard/top-equipment'),
        apiFetch<{ collaborator: { id: string; name: string; role: string }; rating: number; eventCount: number }[]>('/dashboard/top-collaborators')
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      else setError('Não foi possível carregar os indicadores do painel.');
      if (actsRes.status === 'fulfilled') setActivities(actsRes.value || []);
      if (liveRes.status === 'fulfilled') setLiveStats(liveRes.value);
      if (equipRes.status === 'fulfilled') setTopEquipment(equipRes.value || []);
      if (collabRes.status === 'fulfilled') setTopCollaborators(collabRes.value || []);

      try {
        // Os 5 próximos a partir de hoje, já filtrados e ordenados pelo servidor (antes: todas as
        // reservas, página a página, filtradas aqui).
        setNextBookings(await fetchUpcomingAdminBookings(5));
      } catch {
        // bookings are non-critical — leave list empty on failure
      }

    } catch (error) {
      logger.error('Erro ao carregar dashboard:', 'AdminDashboardPage', error);
      setError('Não foi possível carregar o painel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (loading && !stats) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-700">
          <BrandLoader size="xl" label="Carregando painel…" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="space-y-8">
        {/* Boas-vindas. Antes: gradiente fixo primary→índigo com texto branco (no escuro o primary é
            prata), selo "Status: Operação Nominal" e "o ecossistema está estável" — textos fixos. */}
        <div className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground p-6 sm:p-8 shadow-lg">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" aria-hidden="true" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Olá, {user?.name?.split(' ')[0] || 'Admin'}!
              </h2>
              <p className="text-primary-foreground/80 max-w-md">
                {liveStats
                  ? <TodayOrdersText count={liveStats.todayBookings || 0} />
                  : 'Acompanhe aqui as reservas e os indicadores do mês.'}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <Button
                size="sm"
                onClick={() => navigate('/admin/orcamentos/novo')}
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-md"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Nova proposta
              </Button>
              <div className="relative">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/admin/monitoramento')}
                    className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
                    leftIcon={<Monitor className="h-4 w-4" />}
                >
                    Monitoramento
                </Button>
                {liveStats && liveStats.activeUsers > 0 && (
                  <span
                    className="absolute -top-2 -right-2 inline-flex min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground border-2 border-primary text-xs font-bold items-center justify-center"
                    title={`${liveStats.activeUsers} usuários ativos agora`}
                  >
                    {liveStats.activeUsers}
                    <span className="sr-only"> usuários ativos agora</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* P3: pedidos de clientes aguardando resposta (mesma consulta do número no menu). */}
        <PendingRequestsCard summary={pendingRequests} />

        {error && (
          <Alert
            variant="error"
            title="Erro ao carregar o painel"
            description={error}
            action={<Button variant="outline" size="sm" onClick={fetchDashboardData}>Tentar de novo</Button>}
          />
        )}

        {/* Main Stats Grid — sem estatísticas (falha na API) não mostra cards zerados: o erro não pode
            parecer dado ("0 clientes", "R$ 0,00"). O Alert acima explica e oferece tentar de novo. */}
        {(loading || stats) && (
        <Grid columns={{ sm: 1, md: 2, lg: 4 }} gap={6}>
          {loading ? (
             Array(4).fill(0).map((_, i) => (
               <div key={i} className="h-[140px] p-5 rounded-3xl bg-card border border-border">
                 <Skeleton className="h-12 w-12 rounded-2xl" />
                 <div className="mt-4 space-y-2">
                   <Skeleton className="h-3 w-24" />
                   <Skeleton className="h-6 w-16" />
                 </div>
               </div>
             ))
          ) : (
            <>
              <StatItem
                title="Clientes"
                value={stats?.totalClients || 0}
                icon={Users}
                description="Clientes cadastrados"
                tone="primary"
                onClick={() => navigate('/admin/clientes')}
              />
              <StatItem
                title="Reservas confirmadas"
                value={stats?.confirmedBookings || 0}
                icon={Calendar}
                trend={stats?.bookingsGrowth ? { value: stats.bookingsGrowth, type: stats.bookingsGrowth > 0 ? 'positive' : 'negative' } : undefined}
                description="Com status Confirmada"
                tone="success"
                onClick={() => navigate('/admin/reservas')}
              />
              <StatItem
                title="Faturamento"
                value={formatCurrency(stats?.totalRevenue || 0)}
                icon={DollarSign}
                trend={stats?.revenueGrowth ? { value: stats.revenueGrowth, type: stats.revenueGrowth > 0 ? 'positive' : 'negative' } : undefined}
                tone="info"
              />
              <StatItem
                title="Equipamentos"
                value={stats?.totalEquipments || 0}
                icon={Camera}
                description="Equipamentos cadastrados"
                tone="primary"
                onClick={() => navigate('/admin/equipamentos')}
              />
            </>
          )}
        </Grid>
        )}

        {/* Integrações */}
        <Card className="p-6 border-l-4 border-l-primary">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" aria-hidden="true" />
              Google Agenda
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sincronize automaticamente todas as reservas confirmadas com o calendário oficial da X Produções.
            </p>
          </div>
          <GoogleCalendarIntegration
            googleCalendarEmail={user?.googleCalendarEmail}
            needsReconnect={user?.googleCalendarNeedsReconnect}
          />
        </Card>

        {/* Revenue Chart Section */}
        <Card className="p-6 overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <CreditCard className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Receita mensal</h3>
              <p className="text-sm text-muted-foreground">Receita por mês no ano selecionado</p>
            </div>
          </div>
          {loading ? (
             <Skeleton className="h-[300px] w-full" />
          ) : (
            <ReceitaMensalChart year={new Date().getFullYear()} />
          )}
        </Card>

        {/* Dynamic Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity Column */}
          <div className="lg:col-span-1 min-w-0">
            <RecentActivityList activities={activities} loading={loading} />
          </div>

          {/* Detailed Intelligence Column */}
          <div className="lg:col-span-2 space-y-8 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <EfficiencyStats stats={stats} loading={loading} />

              <Card className="p-6 overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 mb-6 shrink-0">
                  <Star className="h-4 w-4 text-warning" aria-hidden="true" />
                  <h3 className="text-base font-bold text-foreground">Colaboradores em destaque</h3>
                </div>
                <div className="space-y-3 flex-1">
                  {loading ? (
                    <div className="space-y-3" role="status" aria-label="Carregando colaboradores">
                      <Skeleton className="h-10" />
                      <Skeleton className="h-10" />
                      <Skeleton className="h-10" />
                    </div>
                  ) : topCollaborators.length > 0 ? (
                    topCollaborators.slice(0, 4).map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 p-2 rounded-xl">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary border border-primary/20" aria-hidden="true">
                            {item.collaborator.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{item.collaborator.name}</p>
                            <p className="text-xs text-muted-foreground">{collaboratorRoleLabel(item.collaborator.role)}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-warning">★ {item.rating.toFixed(1)}</p>
                          <p className="text-xs text-muted-foreground">{item.eventCount} eventos</p>
                        </div>
                      </div>
                    ))
                  ) : <p className="text-sm text-muted-foreground text-center py-10">Ainda não há avaliações de colaboradores.</p>}
                </div>
              </Card>
            </div>

            {/* Inventory Insights */}
            <Card className="p-0 overflow-hidden">
               <div className="p-6 border-b border-border bg-muted/20 flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-base font-bold text-foreground">Equipamentos mais locados</h3>
               </div>
               <div className="p-6">
                 {loading ? (
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                   </div>
                 ) : topEquipment.length > 0 ? (
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     {topEquipment.slice(0, 3).map((item, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-muted/50 border border-border">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{i + 1}º mais locado</p>
                            <p className="text-sm font-semibold text-foreground truncate mb-3">{item.name}</p>
                            <Badge variant="primary">
                               {item.bookings} reservas
                            </Badge>
                        </div>
                     ))}
                   </div>
                 ) : (
                   <p className="text-sm text-muted-foreground text-center py-6">Ainda não há locações registradas.</p>
                 )}
               </div>
            </Card>
          </div>
        </div>

        {/* Bottom Section: Upcoming Schedule */}
        <Card className="p-0 overflow-hidden">
          <div className="p-6 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-muted/20">
             <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
                <h3 className="text-base font-bold text-foreground">Próximos eventos</h3>
             </div>
             {/* Antes ia para /admin/agenda, rota que não existe. */}
             <Button variant="outline" size="xs" onClick={() => navigate('/admin/reservas/calendario')}>
                Ver agenda
             </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Data</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {nextBookings.length > 0 ? nextBookings.map((booking) => {
                  const name = booking.client?.user?.name || booking.clientName || 'Cliente não informado';
                  return (
                  <tr key={booking.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0" aria-hidden="true">
                            <Users className="h-4 w-4" />
                         </div>
                         <span className="text-sm font-semibold text-foreground">{name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(booking.eventDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={bookingStatusVariant(booking.status)}>
                        {bookingStatusLabel(booking.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => navigate(`/admin/reservas/${booking.id}`)}
                        aria-label={`Abrir reserva de ${name}`}
                      >
                        Abrir
                      </Button>
                    </td>
                  </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground">
                       Nenhum evento agendado a partir de hoje.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;
