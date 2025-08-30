import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { PageLayout } from '../../components/layouts/PageLayout';
import { DashboardEvent } from '../../types/types';
import { collaboratorsAPI } from '../../services/api';

// Componente de Estat�sticas
const StatsCards: React.FC<{ data: any | null }> = ({ data }) => {
  if (!data) return null;

  const cards = [
    { title: 'Total colaboradores', value: data.totalCollaborators ?? 0, color: 'from-blue-500 to-blue-600' },
    { title: 'Ativos', value: data.activeCollaborators ?? 0, color: 'from-green-500 to-green-600' },
    { title: 'Eventos (por status)', value: JSON.stringify(data.eventStats || {}), color: 'from-purple-500 to-purple-600' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <div key={index} className="bg-card border border-border/50 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
            </div>
            <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-lg flex items-center justify-center text-white text-xl shadow-lg`} />
          </div>
        </div>
      ))}
    </div>
  );
};

// Componente de Pr�ximos Eventos
const UpcomingEvents: React.FC<{ events: DashboardEvent[] }> = ({ events }) => (
  <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-semibold text-foreground">Pr�ximos Eventos</h3>
      <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
        Ver todos
      </button>
    </div>
    
    {events.length === 0 ? (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-muted-foreground">Nenhum evento agendado</p>
      </div>
    ) : (
      <div className="space-y-4">
        {events.slice(0, 3).map((event, index) => (
          <div
            key={event.id || index}
            className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors duration-200 border border-border/30"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <svg
                  className="w-5 h-5 text-white"
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
              <div>
                <p className="font-medium text-foreground">{event.title || 'Evento'}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(event.startTime).toLocaleDateString('pt-BR')} � R${' '}
                  {event.totalPayment?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 text-xs rounded-full font-medium ${
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
                  ? 'Atribu�do'
                  : event.status}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

// Componente principal
const CollaboratorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [events] = useState<DashboardEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const resp = await collaboratorsAPI.getMyDashboard();
        // Axios response shape: resp.data -> { success: true, data: ... }
        const payload = resp.data?.data ?? resp.data;
        setDashboard(payload);
        // events: keep previous mock or try to map topPerformers to events slice (not ideal)
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Redirect se n�o for colaborador
  if (user?.role !== 'COLLABORATOR') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <PageLayout title="Dashboard do Colaborador">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-8">
          <StatsCards data={dashboard} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <UpcomingEvents events={events} />

            <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-6">Ações Rápidas</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-4 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg transition-colors group">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="font-medium text-foreground">Ver Agenda</span>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 border border-border/30 rounded-lg transition-colors group">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="font-medium text-foreground">Atualizar Perfil</span>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 border border-border/30 rounded-lg transition-colors group">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="font-medium text-foreground">Mensagens</span>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default CollaboratorDashboard;

