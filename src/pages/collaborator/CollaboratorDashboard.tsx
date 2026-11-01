import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { CollaboratorLoading, CollaboratorError } from '../../components/collaborator/CollaboratorStates';
import type { DashboardEvent } from '../../types/domains/dashboard';
import { collaboratorsAPI } from '../../services/api';
import { StatsCard, SimpleCard } from '../../components/ui/Cards';
import { Badge } from '../../components/ui/Badge';
import { formatPrice } from '@/utils/formatPrice';
import { bookingStatusLabel, bookingStatusVariant } from '@/utils/bookingStatus';
import { logger } from '../../utils/logger';
import {
  Calendar,
  DollarSign,
  Star,
  ArrowUpRight,
  CheckCircle,
  User,
  Target,
  Clock,
  MessageSquare,
  FileText,
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

const BREADCRUMBS = [
  { name: 'Colaborador', href: '/colaborador/painel' },
  { name: 'Dashboard' },
];

// Componente de Métricas Profissionais com Dados Reais
const ProfessionalMetrics: React.FC<{ data: DashboardMetrics | null }> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
        value={data.averageRating ? `${data.averageRating.toFixed(1)} / 5` : 'Sem avaliações'}
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

// Componente de Próximos Eventos
const UpcomingEvents: React.FC<{ events: DashboardEvent[] }> = ({ events }) => (
  <SimpleCard
    title="Próximos Eventos"
    headerRight={
      <Link to="/colaborador/agenda" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors inline-flex items-center gap-1 min-h-10">
        <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
        Ver agenda
      </Link>
    }
  >
    {events.length === 0 ? (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
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
            className="flex flex-col gap-3 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors duration-200 border border-border group sm:flex-row sm:items-center sm:justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 shrink-0 bg-primary rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                  {event.title || 'Evento'}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" aria-hidden="true" />
                    {new Date(event.startTime).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" aria-hidden="true" />
                    {new Date(event.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
              <Badge variant={bookingStatusVariant(event.status)}>{bookingStatusLabel(event.status)}</Badge>
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

const activityIcon = (type?: string) => {
  if (type === 'payment') return <DollarSign className="w-4 h-4 text-primary" aria-hidden="true" />;
  if (type === 'event') return <Calendar className="w-4 h-4 text-primary" aria-hidden="true" />;
  return <FileText className="w-4 h-4 text-primary" aria-hidden="true" />;
};

// Componente de Atividades Recentes
const RecentActivities: React.FC<{ activities: CollaboratorActivity[] }> = ({ activities }) => (
  <SimpleCard
    title="Atividades Recentes"
    headerRight={
      <Link to="/colaborador/notificacoes" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors inline-flex items-center min-h-10">
        Ver todas
      </Link>
    }
  >
    {activities.length === 0 ? (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-muted-foreground">Nenhuma atividade recente</p>
      </div>
    ) : (
      <div className="space-y-4">
        {activities.slice(0, 5).map((activity, index) => (
          <div key={index} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              {activityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{activity.title}</p>
              <p className="text-sm text-muted-foreground">{activity.description}</p>
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

const quickActionClass =
  'flex flex-col items-center justify-center min-h-[120px] p-6 rounded-xl border transition-all group active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

// Componente principal
const CollaboratorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardMetrics | null>(null);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [activities, setActivities] = useState<CollaboratorActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const resp = await collaboratorsAPI.getMyDashboard();
      const payload = (resp.data?.data ?? resp.data) as DashboardMetrics;
      setDashboard(payload);
      setEvents(payload.upcomingEvents ?? []);
      setActivities(payload.recentActivities ?? []);
    } catch (err) {
      logger.error('Erro ao carregar dados do dashboard:', 'CollaboratorDashboard', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (user?.role !== 'COLLABORATOR') {
    return <Navigate to="/painel" replace />;
  }

  const firstName = user?.name?.split(' ')[0] || 'Colaborador';

  return (
    <CollaboratorLayout title="Dashboard do Colaborador" breadcrumbs={BREADCRUMBS}>
      {loading ? (
        <CollaboratorLoading label="Carregando seu painel…" />
      ) : error ? (
        <CollaboratorError
          message="Não conseguimos carregar suas métricas e eventos agora."
          onRetry={fetchDashboardData}
        />
      ) : (
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 rounded-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                {/* Saudação em <p>: o <h1> da página é o título do layout. */}
                <p className="text-2xl font-bold mb-2">Olá, {firstName}!</p>
                <p className="text-primary-foreground/80">
                  Bem-vindo de volta ao seu painel. Aqui está o resumo da sua atividade.
                </p>
              </div>
              <div className="hidden md:block">
                <div className="w-16 h-16 bg-primary-foreground/10 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-primary-foreground" aria-hidden="true" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/colaborador/agenda" className={`${quickActionClass} bg-primary/5 hover:bg-primary/10 border-primary/20`}>
                <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary/30 transition-colors">
                  <Calendar className="w-7 h-7 text-primary" aria-hidden="true" />
                </div>
                <span className="font-semibold text-foreground text-sm">Ver Agenda</span>
                <span className="text-xs text-muted-foreground mt-1 text-center">Calendário completo de eventos</span>
              </Link>

              <Link to="/colaborador/perfil" className={`${quickActionClass} bg-muted/30 hover:bg-muted/50 border-border`}>
                <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mb-3 group-hover:bg-muted/80 transition-colors">
                  <User className="w-7 h-7 text-muted-foreground" aria-hidden="true" />
                </div>
                <span className="font-semibold text-foreground text-sm">Meu Perfil</span>
                <span className="text-xs text-muted-foreground mt-1 text-center">Minhas informações</span>
              </Link>

              <Link to="/colaborador/mensagens" className={`${quickActionClass} bg-muted/30 hover:bg-muted/50 border-border`}>
                <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mb-3 group-hover:bg-muted/80 transition-colors">
                  <MessageSquare className="w-7 h-7 text-muted-foreground" aria-hidden="true" />
                </div>
                <span className="font-semibold text-foreground text-sm">Mensagens</span>
                <span className="text-xs text-muted-foreground mt-1 text-center">Falar com a base</span>
              </Link>

              <Link to="/colaborador/ganhos" className={`${quickActionClass} bg-muted/30 hover:bg-muted/50 border-border`}>
                <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mb-3 group-hover:bg-muted/80 transition-colors">
                  <CheckCircle className="w-7 h-7 text-muted-foreground" aria-hidden="true" />
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
