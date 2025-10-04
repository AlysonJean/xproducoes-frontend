import React, { useState, useEffect } from 'react';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { StatsCard, SimpleCard } from '../../components/ui/Cards';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Download,
  Eye,
  Clock,
  Target,
  Star,
  FileText
} from 'lucide-react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Bar } from 'recharts';

import { ReportData } from '@/types/types';

const CollaboratorReportsPage: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'3months' | '6months' | '1year'>('6months');

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        // Simular dados até implementar API real
        const mockData: ReportData = {
          performance: {
            eventsCompleted: 45,
            completionRate: 95.5,
            averageRating: 4.7,
            onTimeDelivery: 92.3
          },
          monthly: [
            { month: 'Jan', events: 12, rating: 4.5, earnings: 2800 },
            { month: 'Fev', events: 14, rating: 4.6, earnings: 3100 },
            { month: 'Mar', events: 13, rating: 4.7, earnings: 2900 },
            { month: 'Abr', events: 16, rating: 4.8, earnings: 3400 },
            { month: 'Mai', events: 15, rating: 4.7, earnings: 3200 },
            { month: 'Jun', events: 18, rating: 4.9, earnings: 3600 },
          ],
          eventTypes: [
            { type: 'Casamentos', count: 15, percentage: 33.3, color: '#3b82f6' },
            { type: 'Aniversários', count: 12, percentage: 26.7, color: '#10b981' },
            { type: 'Formaturas', count: 8, percentage: 17.8, color: '#f59e0b' },
            { type: 'Corporativo', count: 6, percentage: 13.3, color: '#ef4444' },
            { type: 'Outros', count: 4, percentage: 8.9, color: '#8b5cf6' }
          ],
          timeAnalysis: {
            mostProductiveHour: '14:00 - 18:00',
            averageEventDuration: '4h 30min',
            workingDaysPerMonth: 22
          }
        };
        setReportData(mockData);
      } catch (error) {
        console.error('Erro ao buscar dados de relatórios:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [selectedPeriod]);

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${percentage.toFixed(1)}%`}
      </text>
    );
  };

  if (loading) {
    return (
      <CollaboratorLayout 
        title="Relatórios de Performance"
        breadcrumbs={[
          { name: 'Colaborador', href: '/collaborator' },
          { name: 'Relatórios' }
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
      title="Relatórios de Performance"
      breadcrumbs={[
        { name: 'Colaborador', href: '/collaborator' },
        { name: 'Relatórios' }
      ]}
    >
      <div className="space-y-8">
        {/* Métricas de Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Eventos Concluídos"
            value={reportData?.performance?.eventsCompleted || 0}
            description="Total de eventos finalizados"
            icon={<Calendar className="h-5 w-5" />}
          />
          
          <StatsCard
            title="Taxa de Conclusão"
            value={`${reportData?.performance?.completionRate || 0}%`}
            description="Eventos finalizados com sucesso"
            icon={<Target className="h-5 w-5" />}
          />

          <StatsCard
            title="Avaliação Média"
            value={`${reportData?.performance?.averageRating || 0}★`}
            description="Nota média dos clientes"
            icon={<Star className="h-5 w-5" />}
          />

          <StatsCard
            title="Pontualidade"
            value={`${reportData?.performance?.onTimeDelivery || 0}%`}
            description="Eventos entregues no prazo"
            icon={<Clock className="h-5 w-5" />}
          />
        </div>

        {/* Gráficos de Análise */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Performance Mensal */}
          <SimpleCard 
            title="Performance Mensal"
            headerRight={
              <div className="flex items-center space-x-4">
                <select 
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as '3months' | '6months' | '1year')}
                  className="px-3 py-1 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Selecionar período do relatório"
                >
                  <option value="3months">Últimos 3 meses</option>
                  <option value="6months">Últimos 6 meses</option>
                  <option value="1year">Último ano</option>
                </select>
              </div>
            }
          >
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData?.monthly || []}>
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'events') return [value, 'Eventos'];
                      if (name === 'rating') return [`${value}★`, 'Avaliação'];
                      return [value, name];
                    }}
                  />
                  <Bar yAxisId="left" dataKey="events" fill="#3b82f6" name="events" />
                  <Line yAxisId="right" type="monotone" dataKey="rating" stroke="#10b981" strokeWidth={3} name="rating" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SimpleCard>

          {/* Tipos de Eventos */}
          <SimpleCard title="Distribuição por Tipo de Evento">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportData?.eventTypes || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {reportData?.eventTypes?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} eventos`, 'Quantidade']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legenda */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {reportData?.eventTypes?.map((type, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div 
                    className={`w-3 h-3 rounded-full ${
                      type.color === '#3b82f6' ? 'bg-blue-500' :
                      type.color === '#10b981' ? 'bg-emerald-500' :
                      type.color === '#f59e0b' ? 'bg-amber-500' :
                      type.color === '#ef4444' ? 'bg-red-500' :
                      'bg-purple-500'
                    }`}
                  ></div>
                  <span className="text-sm text-foreground">{type.type}</span>
                  <span className="text-sm text-muted-foreground">({type.count})</span>
                </div>
              ))}
            </div>
          </SimpleCard>
        </div>

        {/* Análises Detalhadas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Análise de Tempo */}
          <SimpleCard title="Análise de Produtividade">
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Horário Mais Produtivo</p>
                    <p className="text-sm text-blue-700">Período de melhor performance</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-blue-900">
                  {reportData?.timeAnalysis?.mostProductiveHour || 'N/A'}
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900">Duração Média</p>
                    <p className="text-sm text-green-700">Tempo médio por evento</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-green-900">
                  {reportData?.timeAnalysis?.averageEventDuration || 'N/A'}
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-purple-900">Dias Trabalhados</p>
                    <p className="text-sm text-purple-700">Média mensal</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-purple-900">
                  {reportData?.timeAnalysis?.workingDaysPerMonth || 0} dias
                </p>
              </div>
            </div>
          </SimpleCard>

          {/* Ações de Relatório */}
          <SimpleCard title="Exportar Relatórios">
            <div className="space-y-4">
              <div className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Relatório Completo</p>
                      <p className="text-sm text-muted-foreground">PDF com todas as métricas</p>
                    </div>
                  </div>
                  <Download className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Dados de Performance</p>
                      <p className="text-sm text-muted-foreground">Planilha Excel com dados brutos</p>
                    </div>
                  </div>
                  <Download className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Eye className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Resumo Executivo</p>
                      <p className="text-sm text-muted-foreground">Visão geral para apresentações</p>
                    </div>
                  </div>
                  <Download className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <button className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                  Gerar Relatório Personalizado
                </button>
              </div>
            </div>
          </SimpleCard>
        </div>
      </div>
    </CollaboratorLayout>
  );
};

export default CollaboratorReportsPage;