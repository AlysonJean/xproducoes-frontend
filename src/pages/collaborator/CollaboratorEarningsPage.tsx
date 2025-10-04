import React, { useState, useEffect } from 'react';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { StatsCard, SimpleCard } from '../../components/ui/Cards';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Clock,
  Download,
  Banknote,
  PiggyBank
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface EarningsData {
  totalEarnings: number;
  monthlyEarnings: number;
  yearlyEarnings: number;
  pendingPayments: number;
  averagePerEvent: number;
  eventsCompleted: number;
  earningsGrowth: number;
  monthlyData: Array<{
    month: string;
    earnings: number;
    events: number;
  }>;
  recentPayments: Array<{
    id: string;
    eventTitle: string;
    amount: number;
    date: string;
    status: 'PAID' | 'PENDING' | 'PROCESSING';
  }>;
}

const CollaboratorEarningsPage: React.FC = () => {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year'>('month');

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        setLoading(true);
        // Simular dados até implementar API real
        const mockData: EarningsData = {
          totalEarnings: 12450.00,
          monthlyEarnings: 3200.00,
          yearlyEarnings: 28900.00,
          pendingPayments: 850.00,
          averagePerEvent: 275.00,
          eventsCompleted: 45,
          earningsGrowth: 15.5,
          monthlyData: [
            { month: 'Jan', earnings: 2800, events: 12 },
            { month: 'Fev', earnings: 3100, events: 14 },
            { month: 'Mar', earnings: 2900, events: 13 },
            { month: 'Abr', earnings: 3400, events: 16 },
            { month: 'Mai', earnings: 3200, events: 15 },
            { month: 'Jun', earnings: 3600, events: 18 },
          ],
          recentPayments: [
            {
              id: '1',
              eventTitle: 'Casamento Silva & Costa',
              amount: 450.00,
              date: '2025-09-10',
              status: 'PAID'
            },
            {
              id: '2',
              eventTitle: 'Aniversário 15 anos Maria',
              amount: 320.00,
              date: '2025-09-08',
              status: 'PAID'
            },
            {
              id: '3',
              eventTitle: 'Formatura Medicina UFPE',
              amount: 380.00,
              date: '2025-09-05',
              status: 'PROCESSING'
            }
          ]
        };
        setEarnings(mockData);
      } catch (error) {
        console.error('Erro ao buscar dados de ganhos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'Pago';
      case 'PENDING':
        return 'Pendente';
      case 'PROCESSING':
        return 'Processando';
      default:
        return 'Desconhecido';
    }
  };

  if (loading) {
    return (
      <CollaboratorLayout 
        title="Ganhos e Receitas"
        breadcrumbs={[
          { name: 'Colaborador', href: '/collaborator' },
          { name: 'Ganhos' }
        ]}
      >
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </CollaboratorLayout>
    );
  }

  return (
    <CollaboratorLayout 
      title="Ganhos e Receitas"
      breadcrumbs={[
        { name: 'Colaborador', href: '/collaborator' },
        { name: 'Ganhos' }
      ]}
    >
      <div className="space-y-8">
        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Geral"
            value={`R$ ${earnings?.totalEarnings?.toLocaleString('pt-BR') || '0'}`}
            description="Ganhos acumulados"
            icon={<DollarSign className="h-5 w-5" />}
            trend={earnings?.earningsGrowth ? {
              value: earnings.earningsGrowth,
              type: earnings.earningsGrowth > 0 ? 'positive' : 'negative'
            } : undefined}
          />
          
          <StatsCard
            title="Este Mês"
            value={`R$ ${earnings?.monthlyEarnings?.toLocaleString('pt-BR') || '0'}`}
            description="Receita do mês atual"
            icon={<Calendar className="h-5 w-5" />}
          />

          <StatsCard
            title="Média por Evento"
            value={`R$ ${earnings?.averagePerEvent?.toLocaleString('pt-BR') || '0'}`}
            description="Valor médio recebido"
            icon={<TrendingUp className="h-5 w-5" />}
          />

          <StatsCard
            title="Pagamentos Pendentes"
            value={`R$ ${earnings?.pendingPayments?.toLocaleString('pt-BR') || '0'}`}
            description="Aguardando processamento"
            icon={<Clock className="h-5 w-5" />}
          />
        </div>

        {/* Gráfico de Ganhos */}
        <SimpleCard 
          title="Evolução dos Ganhos"
          headerRight={
            <div className="flex items-center space-x-4">
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as 'month' | 'year')}
                className="px-3 py-1 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Selecionar período do gráfico"
              >
                <option value="month">Últimos 6 meses</option>
                <option value="year">Último ano</option>
              </select>
              <button className="flex items-center space-x-2 px-3 py-1 text-sm text-primary hover:text-primary/80 transition-colors">
                <Download className="w-4 h-4" />
                <span>Exportar</span>
              </button>
            </div>
          }
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={earnings?.monthlyData || []}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `R$ ${Number(value).toLocaleString('pt-BR')}`,
                    name === 'earnings' ? 'Ganhos' : 'Eventos'
                  ]}
                />
                <Bar dataKey="earnings" fill="#3b82f6" name="earnings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SimpleCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pagamentos Recentes */}
          <SimpleCard 
            title="Pagamentos Recentes"
            headerRight={
              <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                Ver todos
              </button>
            }
          >
            <div className="space-y-4">
              {earnings?.recentPayments?.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/30">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Banknote className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{payment.eventTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payment.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      R$ {payment.amount.toLocaleString('pt-BR')}
                    </p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
                      {getStatusText(payment.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SimpleCard>

          {/* Resumo Financeiro */}
          <SimpleCard title="Resumo Financeiro">
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <PiggyBank className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900">Total Recebido</p>
                    <p className="text-sm text-green-700">Pagamentos confirmados</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-green-900">
                  R$ {((earnings?.totalEarnings || 0) - (earnings?.pendingPayments || 0)).toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-yellow-900">Aguardando</p>
                    <p className="text-sm text-yellow-700">Pagamentos pendentes</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-yellow-900">
                  R$ {earnings?.pendingPayments?.toLocaleString('pt-BR') || '0'}
                </p>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Eventos Concluídos</span>
                  <span className="text-lg font-bold text-foreground">{earnings?.eventsCompleted || 0}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-medium text-foreground">Média por Evento</span>
                  <span className="text-lg font-bold text-primary">
                    R$ {earnings?.averagePerEvent?.toLocaleString('pt-BR') || '0'}
                  </span>
                </div>
              </div>
            </div>
          </SimpleCard>
        </div>
      </div>
    </CollaboratorLayout>
  );
};

export default CollaboratorEarningsPage;