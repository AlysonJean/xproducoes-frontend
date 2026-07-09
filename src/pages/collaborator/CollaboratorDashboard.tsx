import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { BrandLoader } from '../../components/ui/BrandLoader';
import type { DashboardEvent } from '../../types/domains/dashboard';
import { collaboratorsAPI } from '../../services/api';
import { StatsCard, SimpleCard } from '../../components/ui/Cards';
import { formatPrice } from '@/utils/formatPrice';
import {
  Calendar,
  DollarSign,
  Star,
  ArrowUpRight,
  CheckCircle,
  User,
  Target,
  Clock,
  MessageSquare
} from 'lucide-react';

interface CollaboratorActivity {
  type?: string;
  title: string;
  description: string;
  timestamp: string;
}

interface DashboardMetrics {
  totalEarnings?: number;
  earningsGrowth?: number;
  totalEvents?: number;
  eventsGrowth?: number;
  completionRate?: number;
  averageRating?: number;
  upcomingEvents?: DashboardEvent[];
  recentActivities?: CollaboratorActivity[];
}

// Componente de Métricas Profissionais com Dados Reais
const ProfessionalMetrics: React.FC<{ data: DashboardMetrics | null }> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatsCard
        title="Receita Total"
        value={formatPrice(data.totalEarnings || 0)}
        description="Ganhos acumulados"
        icon={<DollarSign className="h-5 w-5" />}
        trend={data.earningsGrowth ? {
          value: data.earningsGrowth,
          type: data.earningsGrowth > 0 ? 'positive' : data.earningsGrowth < 0 ? 'negative' : 'neutral'
        } : undefined}
      />
      
      <StatsCard
        title="Eventos Realizados"
        value={data.totalEvents || 0}
        description="Total de eventos concluídos"
        icon={<Calendar className="h-5 w-5" />}
        trend={data.eventsGrowth ? {
          value: data.eventsGrowth,
          type: data.eventsGrowth > 0 ? 'positive' : data.eventsGrowth < 0 ? 'negative' : 'neutral'
        } : undefined}
      />

      <StatsCard
        title="Taxa de Conclusão"
        value={data.completionRate ? `${data.completionRate}%` : '0%'}
        description="Eventos finalizados com sucesso"
        icon={<Target className="h-5 w-5" />}
        trend={data.completionRate !== undefined && data.completionRate > 90 ? {
          value: data.completionRate,
          type: 'positive'
        } : undefined}
      />

      <StatsCard
        title="Avaliação Média"
        value={data.averageRating ? `${data.averageRating.toFixed(1)}⭐` : 'N/A'}
        description="Feedback dos clientes"
        icon={<Star className="h-5 w-5" />}
        trend={data.averageRating !== undefined && data.averageRating > 4.5 ? {
          value: data.averageRating,
          type: 'positive'
        } : undefined}
      />
    </div>
  );
};

// Componente de Próximos Eventos Melhorado
const UpcomingEvents: React.FC<{ events: DashboardEvent[] }> = ({ events }) => (
  <SimpleCard 
    title="Próximos Eventos" 
    headerRight={
      <Link to="/collaborator/schedule" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-2">
        <ArrowUpRight className="w-4 h-4" />
        Ver Agenda Completa
      </Link>
    }
  >
    {events.length === 0 ? (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground mb-2">Nenhum evento agendado</p>
        <p className="text-sm text-muted-foreground">Seus próximos eventos aparecerão aqui</p>
      </div>
    ) : (
      <div className="space-y-4">
        {events.slice(0, 4).map((event: DashboardEvent, index: number) => (
          <Link
            key={event.id || index}
            to={`/colaborador/evento/${event.id}/roadmap`}
            className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors duration-200 border border-border/30 group cursor-pointer"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {event.title || 'Evento'}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(event.startTime).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="flex items-center gap-1 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(event.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`px-3 py-1 text-xs rounded-full font-medium mb-2 block ${
                  event.status === 'CONFIRMED'
                    ? 'bg-success/10 text-success border border-green-200'
                    : event.status === 'ASSIGNED'
                      ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                      : 'bg-muted text-card-foreground border'
                }`}
              >
                {event.status === 'CONFIRMED'
                  ? 'Confirmado'
                  : event.status === 'ASSIGNED'
                    ? 'Atribuído'
                    : event.status}
              </span>
              <p className="text-sm font-medium text-primary">
                {formatPrice(event.totalPayment || 0)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    )}
  </SimpleCard>
);

// Componente de Atividades Recentes
const RecentActivities: React.FC<{ activities: CollaboratorActivity[] }> = ({ activities }) => (
  <SimpleCard 
    title="Atividades Recentes" 
    headerRight={
      <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
        Ver todas
      </button>
    }
  >
    {activities.length === 0 ? (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-muted-foreground">Nenhuma atividade recente</p>
      </div>
    ) : (
      <div className="space-y-4">
        {activities.slice(0, 5).map((activity, index) => (
          <div key={index} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-primary">
                {activity.type === 'payment' ? '💰' :
                 activity.type === 'event' ? '📅' : '📋'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{activity.title}</p>
              <p className="text-xs text-muted-foreground">{activity.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(activity.timestamp).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        ))}
      </div>
    )}
  </SimpleCard>
);

// Componente principal melhorado
const CollaboratorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardMetrics | null>(null);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [activities, setActivities] = useState<CollaboratorActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const resp = await collaboratorsAPI.getMyDashboard();
        const payload = (resp.data?.data ?? resp.data) as DashboardMetrics;
        setDashboard(payload);

        if (payload.upcomingEvents) {
          setEvents(payload.upcomingEvents);
        }
        if (payload.recentActivities) {
          setActivities(payload.recentActivities);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (user?.role !== 'COLLABORATOR') {
    return <Navigate to="/painel" replace />;
  }

  return (
    <CollaboratorLayout 
      title="Dashboard do Colaborador"
      breadcrumbs={[
        { name: 'Colaborador', href: '/collaborator' },
        { name: 'Dashboard' }
      ]}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-700">
          <BrandLoader size="xl" />
          <p className="mt-8 text-muted-foreground font-medium tracking-widest uppercase text-[10px] animate-pulse">
            Sincronizando Agenda X Produções...
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">
                  Olá, {user?.name?.split(' ')[0] || 'Colaborador'}! 👋
                </h1>
                <p className="text-primary-foreground/80">
                  Bem-vindo de volta ao seu painel. Aqui está o resumo da sua atividade.
                </p>
              </div>
              <div className="hidden md:block">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          </div>

          <ProfessionalMetrics data={dashboard} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <UpcomingEvents events={events} />
            <RecentActivities activities={activities} />
          </div>

          <SimpleCard title="Ações Rápidas">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/colaborador/agenda" className="flex flex-col items-center justify-center min-h-[120px] p-6 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl transition-all group active:scale-95">
                <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary/30 transition-colors">
                  <Calendar className="w-7 h-7 text-primary" />
                </div>
                <span className="font-semibold text-foreground text-sm">Ver Agenda</span>
                <span className="text-xs text-muted-foreground mt-1 text-center">Calendário completo de eventos</span>
              </Link>

              <Link to="/colaborador/perfil" className="flex flex-col items-center justify-center min-h-[120px] p-6 bg-muted/30 hover:bg-muted/50 border border-border/30 rounded-xl transition-all group active:scale-95">
                <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mb-3 group-hover:bg-muted/80 transition-colors">
                  <User className="w-7 h-7 text-muted-foreground" />
                </div>
                <span className="font-semibold text-foreground text-sm">Meu Perfil</span>
                <span className="text-xs text-muted-foreground mt-1 text-center">Minhas informações</span>
              </Link>

              <Link to="/colaborador/mensagens" className="flex flex-col items-center justify-center min-h-[120px] p-6 bg-muted/30 hover:bg-muted/50 border border-border/30 rounded-xl transition-all group active:scale-95">
                <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mb-3 group-hover:bg-muted/80 transition-colors">
                  <MessageSquare className="w-7 h-7 text-muted-foreground" />
                </div>
                <span className="font-semibold text-foreground text-sm">Mensagens</span>
                <span className="text-xs text-muted-foreground mt-1 text-center">Falar com a base</span>
              </Link>

              <Link to="/colaborador/ganhos" className="flex flex-col items-center justify-center min-h-[120px] p-6 bg-muted/30 hover:bg-muted/50 border border-border/30 rounded-xl transition-all group active:scale-95">
                <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mb-3 group-hover:bg-muted/80 transition-colors">
                  <CheckCircle className="w-7 h-7 text-muted-foreground" />
                </div>
                <span className="font-semibold text-foreground text-sm">Financeiro</span>
                <span className="text-xs text-muted-foreground mt-1 text-center">Ganhos e pagamentos</span>
              </Link>
            </div>
          </SimpleCard>
        </div>
      )}
    </CollaboratorLayout>
  );
};

export default CollaboratorDashboard;
