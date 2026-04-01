import { ReceitaMensalChart } from '../../components/ReceitaMensalChart';
import { useState, useEffect, useCallback } from 'react';
import { GoogleCalendarIntegration } from '../../components/GoogleCalendarIntegration';

import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
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
  Grid
} from '../../components/ui/StandardComponents';
import type { AdminDashboardStats, Activity as DashboardActivity, AdminNotification } from '../../types/domains/dashboard';
import type { BookingListItem } from '../../types/types';
import { BrandLoader } from '../../components/ui/BrandLoader';

// Componentes internos de apoio para manter o Dashboard conciso
const StatItem = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  description, 
  color = "primary",
  onClick 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  trend?: { value: number; type: 'positive' | 'negative' | 'neutral' };
  description?: string;
  color?: string;
  onClick?: () => void;
}) => (
  <div 
    className={`p-5 group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-border/50 rounded-3xl bg-card/50 backdrop-blur-sm ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-start justify-between">
      <div className={`p-3 rounded-2xl bg-${color}/10 border border-${color}/20 text-${color} group-hover:scale-110 transition-transform duration-500`}>
        <Icon className="h-6 w-6" />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
          trend.type === 'positive' ? 'bg-emerald-500/10 text-emerald-600' : 
          trend.type === 'negative' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
        }`}>
          {trend.type === 'positive' ? <TrendingUp className="h-3 w-3" /> : 
           trend.type === 'negative' ? <TrendingDown className="h-3 w-3" /> : null}
          {trend.value}%
        </div>
      )}
    </div>
    <div className="mt-4">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-2">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-black text-foreground tracking-tight">{value}</h3>
      </div>
      {description && <p className="text-xs text-muted-foreground mt-2 font-medium opacity-70 group-hover:opacity-100 transition-opacity">{description}</p>}
    </div>
  </div>
);

const RecentActivityList = ({ activities, loading }: { activities: DashboardActivity[], loading: boolean }) => {
  const navigate = useNavigate();
  return (
    <Card className="flex flex-col h-full border-border/50 bg-card/30 backdrop-blur-sm p-0 overflow-hidden">
      <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/20">
        <div>
          <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Fluxo de Atividades
          </h3>
          <p className="text-[10px] text-muted-foreground font-medium uppercase mt-1">Registros de sistema em tempo real</p>
        </div>
        <Button variant="ghost" size="sm" className="text-[10px] uppercase font-black tracking-widest" onClick={() => navigate('/admin/reservas')}>
          Ver Tudo <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[400px] p-4 space-y-3">
        {loading ? (
             <div className="space-y-4">
                 {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-start gap-4 p-3 relative overflow-hidden rounded-xl">
                       <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                       <div className="h-10 w-10 shrink-0 rounded-xl bg-muted/40 animate-pulse" />
                       <div className="flex-1 space-y-2 py-1">
                          <div className="h-4 w-3/4 rounded bg-muted/40 animate-pulse" />
                          <div className="h-3 w-1/2 rounded bg-muted/40 animate-pulse" />
                       </div>
                    </div>
                 ))}
             </div>
        ) : activities.length > 0 ? (
          activities.slice(0, 10).map((activity, index) => (
            <div
              key={activity.id || index}
              onClick={() => activity.type === 'booking' && activity.id && navigate(`/admin/reservas/${activity.id}`)}
              className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-200 group border border-transparent ${
                activity.type === 'booking' && activity.id ? 'hover:bg-primary/5 hover:border-primary/10 cursor-pointer' : 'hover:bg-muted/50'
              }`}
            >
              <div className={`mt-1 p-1.5 rounded-lg shrink-0 ${
                activity.type === 'booking' ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-500'
              }`}>
                {activity.type === 'booking' ? <Calendar className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-bold text-foreground truncate">{activity.title || activity.description}</p>
                  <span className="text-[9px] font-black text-muted-foreground uppercase shrink-0">
                    {new Date(activity.timestamp || activity.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{activity.description}</p>
                {activity.amount && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">
                    +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activity.amount)}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/30">
             <Activity className="h-12 w-12 mb-3 opacity-20" />
             <p className="text-xs font-bold uppercase tracking-widest">Feed Silencioso</p>
          </div>
        )}
      </div>
    </Card>
  );
};

const EfficiencyStats = ({ stats, loading }: { stats: AdminDashboardStats | null, loading: boolean }) => (
  <Card className="border-border/50 bg-card/30 backdrop-blur-sm p-6">
    <div className="flex items-center gap-2 mb-6">
      <Target className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Otimização Operacional</h3>
    </div>
    <div className="space-y-6">
      {[
        { label: 'Confirmação de Reservas', value: stats ? Math.round(((stats.confirmedBookings || 0) / Math.max(stats.totalBookings || 1, 1)) * 100) : 0, color: 'bg-emerald-500', icon: CheckCircle2 },
        { label: 'Conclusão de Eventos', value: stats ? Math.round(((stats.completedBookings || 0) / Math.max(stats.totalBookings || 1, 1)) * 100) : 0, color: 'bg-blue-500', icon: BarChart3 },
        { label: 'Ocupação da Equipe', value: stats ? Math.min((stats.activeCollaborators || 0) * 8, 100) : 0, color: 'bg-cyan-500', icon: Users }
      ].map((item, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tighter">
            <span className="flex items-center gap-1.5 text-muted-foreground">
               <item.icon className="h-3.5 w-3.5" /> {item.label}
            </span>
            <span className="text-foreground">{item.value}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${item.color} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)] ${loading ? 'w-0' : ''}`}
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
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [loading, setLoading] = useState(true);
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
      const [statsRes, actsRes, liveRes, , equipRes, collabRes] = await Promise.allSettled([
        apiFetch<AdminDashboardStats>('/dashboard/stats'),
        apiFetch<DashboardActivity[]>('/dashboard/recent-activities'),
        apiFetch<{ todayBookings: number; todayRevenue: number; activeUsers: number }>('/dashboard/live-stats'),
        apiFetch<AdminNotification[]>('/dashboard/notifications'),
        apiFetch<{ name: string; bookings: number }[]>('/dashboard/top-equipment'),
        apiFetch<{ collaborator: { id: string; name: string; role: string }; rating: number; eventCount: number }[]>('/dashboard/top-collaborators')
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (actsRes.status === 'fulfilled') setActivities(actsRes.value || []);
      if (liveRes.status === 'fulfilled') setLiveStats(liveRes.value);
      if (equipRes.status === 'fulfilled') setTopEquipment(equipRes.value || []);
      if (collabRes.status === 'fulfilled') setTopCollaborators(collabRes.value || []);

      try {
        const bookingsResp = await apiFetch<BookingListItem[] | { data: BookingListItem[] }>('/admin/bookings');
        const allBookings = Array.isArray(bookingsResp) ? bookingsResp : Array.isArray(bookingsResp?.data) ? bookingsResp.data : [];
        const now = new Date();
        const upcoming = allBookings
          .filter((b: BookingListItem) => b?.eventDate && new Date(b.eventDate) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
          .sort((a: BookingListItem, b: BookingListItem) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
          .slice(0, 5);
        setNextBookings(upcoming);
      } catch {
        // bookings are non-critical — leave list empty on failure
      }

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
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
      <AdminLayout title="Painel de Controle" breadcrumbs={[{ name: 'Admin' }, { name: 'Dashboard' }]}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-700">
          <BrandLoader size="xl" />
          <p className="mt-8 text-muted-foreground font-medium tracking-widest uppercase text-[10px] animate-pulse">
            Sincronizando Ecossistema X Produções...
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Painel de Controle" breadcrumbs={[{ name: 'Admin' }, { name: 'Dashboard' }]}>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary to-indigo-900 p-8 text-white shadow-2xl">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-primary-foreground/10 blur-2xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <Badge variant="outline" className="mb-4 bg-white/10 border-white/20 text-white font-black tracking-widest text-[9px] uppercase">
                Status: Operação Nominal
              </Badge>
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-2">
                Olá, {user?.name?.split(' ')[0] || 'Admin'}! 👋
              </h1>
              <p className="text-white/70 font-medium max-w-md">
                O ecossistema está estável. Temos <span className="text-white font-bold">{liveStats?.todayBookings || 0} eventos</span> programados para hoje.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3">
              <Button 
                onClick={() => navigate('/admin/reservas/nova')}
                className="bg-white text-primary hover:bg-white/90 border-none font-black uppercase text-[10px] tracking-widest h-12 px-6 rounded-2xl shadow-xl shadow-black/20"
              >
                <Plus className="mr-2 h-4 w-4" /> Lançar Reserva
              </Button>
              <div className="relative">
                <Button 
                    variant="outline" 
                    onClick={() => navigate('/admin/monitoramento')}
                    className="border-white/20 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest h-12 px-6 rounded-2xl backdrop-blur-sm"
                >
                    <Monitor className="mr-2 h-4 w-4" /> Live Tracking
                </Button>
                {liveStats && liveStats.activeUsers > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-indigo-900 text-[8px] font-black items-center justify-center">
                      {liveStats.activeUsers}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Stats Grid */}
        <Grid columns={{ sm: 1, md: 2, lg: 4 }} gap={6}>
          {loading ? (
             Array(4).fill(0).map((_, i) => (
               <div key={i} className="h-[120px] p-5 rounded-[2rem] bg-card/50 border border-border/50 backdrop-blur-sm relative overflow-hidden">
                 <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                 <div className="flex items-start justify-between">
                   <div className="h-12 w-12 rounded-2xl bg-muted/40 animate-pulse" />
                 </div>
                 <div className="mt-4 space-y-2">
                   <div className="h-3 w-24 rounded bg-muted/40 animate-pulse" />
                   <div className="h-6 w-16 rounded bg-muted/40 animate-pulse" />
                 </div>
               </div>
             ))
          ) : (
            <>
              <StatItem 
                title="Base de Clientes" 
                value={stats?.totalClients || 0} 
                icon={Users} 
                description="Total histórico de cadastros" 
                color="primary"
                onClick={() => navigate('/admin/clientes')}
              />
              <StatItem 
                title="Agenda Operacional" 
                value={stats?.confirmedBookings || 0} 
                icon={Calendar} 
                trend={stats?.bookingsGrowth ? { value: stats.bookingsGrowth, type: stats.bookingsGrowth > 0 ? 'positive' : 'negative' } : undefined}
                description="Próximas reservas confirmadas" 
                color="indigo"
                onClick={() => navigate('/admin/reservas')}
              />
              <StatItem 
                title="Faturamento Global" 
                value={formatCurrency(stats?.totalRevenue || 0)} 
                icon={DollarSign} 
                trend={stats?.revenueGrowth ? { value: stats.revenueGrowth, type: stats.revenueGrowth > 0 ? 'positive' : 'negative' } : undefined}
                description="Ticket médio em crescimento" 
                color="emerald"
              />
              <StatItem 
                title="Ativos de Inventário" 
                value={stats?.totalEquipments || 0} 
                icon={Camera} 
                description="Equipamentos sob gestão" 
                color="amber"
                onClick={() => navigate('/admin/equipamentos')}
              />
            </>
          )}
        </Grid>

        {/* Integrações */}
        <div className="grid grid-cols-1 mb-6">
             <Card className="p-6 border-l-4 border-l-indigo-500">
                 <div className="flex items-center justify-between mb-4">
                     <div>
                         <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-600" />
                            Agenda Mestra (Centralizada)
                         </h3>
                         <p className="text-sm text-gray-500 mt-1">
                            Sincronize automaticamente todas as reservas confirmadas com o calendário oficial da X Produções.
                         </p>
                     </div>
                 </div>
                 <GoogleCalendarIntegration googleCalendarEmail={user?.googleCalendarEmail} />
             </Card>
        </div>

        {/* Revenue Chart Section */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-sm p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Desempenho Financeiro</h3>
                <p className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">Visão consolidada do exercício atual</p>
              </div>
            </div>
          </div>
          {loading ? (
             <div className="h-[300px] flex items-center justify-center">
                <BrandLoader size={80} label="Processando gráficos..." />
             </div>
          ) : (
            <ReceitaMensalChart year={new Date().getFullYear()} />
          )}
        </Card>

        {/* Dynamic Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity Column */}
          <div className="lg:col-span-1">
            <RecentActivityList activities={activities} loading={loading} />
          </div>

          {/* Detailed Intelligence Column */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <EfficiencyStats stats={stats} loading={loading} />
              
              <Card className="border-border/50 bg-card/30 backdrop-blur-sm p-6 overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 mb-6 shrink-0">
                  <Star className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Talentos em Destaque</h3>
                </div>
                <div className="space-y-4 flex-1">
                  {loading ? <BrandLoader size={40} /> : topCollaborators.length > 0 ? (
                    topCollaborators.slice(0, 4).map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20">
                            {item.collaborator.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{item.collaborator.name}</p>
                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter">{item.collaborator.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-black text-amber-600">★ {item.rating.toFixed(1)}</p>
                          <p className="text-[9px] text-muted-foreground font-medium">{item.eventCount} missões</p>
                        </div>
                      </div>
                    ))
                  ) : <p className="text-[10px] uppercase font-black text-muted-foreground text-center py-10 opacity-30">Nenhum dado apurado</p>}
                </div>
              </Card>
            </div>

            {/* Inventory Insights */}
            <Card className="border-border/50 bg-card/30 backdrop-blur-sm p-0 overflow-hidden">
               <div className="p-6 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Ranking de Utilização: Equipamentos</h3>
                  </div>
               </div>
               <div className="p-6">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {loading ? Array(3).fill(0).map((_,i) => <div key={i} className="h-12 bg-muted/30 rounded-2xl" />) : 
                    topEquipment.slice(0, 3).map((item, i) => (
                      <div key={i} className="relative group">
                          <div className="p-4 rounded-2xl bg-muted/50 border border-border/50 group-hover:border-primary/30 transition-all">
                              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1 tracking-widest">#0{i+1} Mais Locado</p>
                              <p className="text-xs font-bold text-foreground truncate mb-3">{item.name}</p>
                              <Badge variant="primary" className="text-[9px] font-black uppercase">
                                 {item.bookings} Operações
                              </Badge>
                          </div>
                      </div>
                    ))
                   }
                 </div>
               </div>
            </Card>
          </div>
        </div>

        {/* Bottom Section: Upcoming Schedule */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-sm p-0 overflow-hidden">
          <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/20">
             <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Escale de Próximos Eventos</h3>
             </div>
             <Button variant="outline" size="sm" className="text-[10px] uppercase font-black tracking-widest" onClick={() => navigate('/admin/agenda')}>
                Agenda Completa
             </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  <th className="px-6 py-4">Ficha / Cliente</th>
                  <th className="px-6 py-4">Data Planejada</th>
                  <th className="px-6 py-4">Status Operacional</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {nextBookings.length > 0 ? nextBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                            <Users className="h-4 w-4" />
                         </div>
                         <span className="text-xs font-bold text-foreground">{booking.client?.user?.name || 'Manual Registro'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-muted-foreground">
                        {new Date(booking.eventDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={booking.status === 'CONFIRMED' ? 'success' : 'warning'} className="text-[9px] font-black uppercase">
                        {booking.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/reservas/${booking.id}`)}
                        className="text-[9px] uppercase font-black tracking-widest hover:bg-primary/10 text-primary"
                      >
                        Abrir Ficha
                      </Button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground/30 font-black uppercase text-xs">
                       Nenhuma operação agendada para o curto prazo
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
