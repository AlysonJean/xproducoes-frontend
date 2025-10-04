import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { PageLayout } from '../../components/layouts/PageLayout';
import type { DashboardStats } from '../../types/domains/dashboard';

// Componente de Estatísticas
const StatsCards: React.FC<{ stats: DashboardStats | null }> = ({ stats }) => {
  if (!stats) return null;

  const cards = [
    {
      title: 'Projetos Este Mês',
      value: stats.totalProjects || 0,
      icon: '📊',
      color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      change: '+15%',
    },
    {
      title: 'Receita Total',
      value: `R$ ${(stats.totalEarnings || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: '💰',
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      change: '+12%',
    },
  // Cartão de avaliação removido por política
    {
      title: 'Taxa de Conclusão',
      value: `${Math.round(stats.completionRate || 0)}%`,
      icon: '✅',
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      change: '+8%',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-card/50 backdrop-blur-sm rounded-xl shadow-sm border border-border/50 p-6 hover:shadow-md transition-all duration-300 hover:scale-105"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
              <p className="text-2xl font-bold text-foreground mt-2">{card.value}</p>
              <p className="text-sm text-success mt-1">{card.change} este mês</p>
            </div>
            <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center text-white text-xl shadow-lg`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const FreelancerDashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // Simular dados para demonstração
        setStats({
          totalProjects: 8,
          totalEarnings: 12500.00,
          averageRating: 4.9,
          completionRate: 98,
        });
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Verificar autenticação e role
  if (!isAuthenticated || user?.role !== 'FREELANCER') {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <PageLayout
      title="Dashboard Freelancer"
      description={`Bem-vindo de volta, ${user?.name}! 🚀`}
    >
      <div className="space-y-8">
        {/* Estatísticas */}
        <StatsCards stats={stats} />

        {/* Área principal do dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projetos - 2/3 da largura */}
          <div className="lg:col-span-2 bg-card/50 backdrop-blur-sm rounded-xl shadow-sm border border-border/50 p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Projetos Ativos</h3>
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-muted-foreground">Nenhum projeto ativo no momento</p>
            </div>
          </div>

          {/* Sidebar - 1/3 da largura */}
          <div className="space-y-6">
            {/* Agenda */}
            <div className="bg-card/50 backdrop-blur-sm rounded-xl shadow-sm border border-border/50 p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Agenda</h3>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full text-white text-2xl font-bold mb-2 shadow-lg">
                  {new Date().getDate()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Ferramentas */}
            <div className="bg-card/50 backdrop-blur-sm rounded-xl shadow-sm border border-border/50 p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Ferramentas</h3>
              <div className="space-y-3">
                <button className="w-full bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border border-primary/20">
                  Novo Projeto
                </button>
                <button className="w-full bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border border-border/30">
                  Relatórios
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
