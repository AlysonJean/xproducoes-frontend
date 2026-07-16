import React, { useState, useEffect } from 'react';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import BrandLoader from '../../components/ui/BrandLoader';
import { StatsCard, SimpleCard } from '../../components/ui/Cards';
import {
  Clock,
  Target,
  Star,
  TrendingUp,
  Download,
  Calendar
} from 'lucide-react';
import { LineChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { collaboratorProfileAPI } from '../../services/api';
import { asArray } from '../../utils/normalize';

import { ReportData } from '@/types/types';
import { logger } from '../../utils/logger';

interface CollaboratorStatsResponse {
  totalEvents?: number;
  completionRate?: number;
  averageRating?: number;
  monthlyEarnings?: Array<{ month: string; events: number; earnings: number }>;
  monthlyRatings?: Array<{ month: string; averageRating: number }>;
  mostProductiveHour?: number | null;
  averageEventDuration?: number;
  workingDaysPerMonth?: number;
}

// Baixa os dados mensais já carregados como CSV — substitui os 3 cards de "exportar" que
// não tinham nenhum handler (achado de auditoria: eram apenas divs decorativas com ícone
// de download). Um único export real em vez de três botões fingindo gerar arquivos distintos.
function downloadMonthlyReportCsv(rows: Array<{ month: string; events: number; rating: number; earnings: number }>) {
  const header = 'Mês,Eventos,Avaliação Média,Ganhos (R$)';
  const lines = rows.map((r) => `${r.month},${r.events},${r.rating.toFixed(2)},${r.earnings.toFixed(2)}`);
  const csv = [header, ...lines].join('\n');
  // BOM (via code point, não literal — evita caractere invisível no código-fonte) para o
  // Excel reconhecer UTF-8 e não corromper os acentos.
  const blob = new Blob([String.fromCharCode(0xfeff) + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio-performance-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const CollaboratorReportsPage: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'3months' | '6months' | '1year'>('6months');

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        // Buscar dados reais da API
        const response = await collaboratorProfileAPI.getStats();
        const apiStats = (response.data?.data ?? response.data) as CollaboratorStatsResponse;

        // Mapa mês -> avaliação média real (histórico mensal, ver collaboratorRepository.getMonthlyRatings)
        const ratingsByMonth = new Map<string, number>(
          asArray<{ month: string; averageRating: number }>(apiStats?.monthlyRatings).map((r) => [r.month, Number(r.averageRating)])
        );

        // Mapear dados da API para o formato do relatório
        const report: ReportData = {
          performance: {
            eventsCompleted: Number(apiStats.totalEvents || 0),
            completionRate: Number(apiStats.completionRate || 0),
            averageRating: Number(apiStats.averageRating || 0),
          },
           // Mapear ganhos mensais do backend — avaliação mensal real quando existir para o mês,
           // senão cai na média geral (ex.: mês sem nenhuma avaliação registrada ainda).
                  monthly: asArray<{ month: string; events: number; earnings: number }>(apiStats?.monthlyEarnings).map((m) => ({
             month: m.month,
             events: Number(m.events),
             rating: ratingsByMonth.get(m.month) ?? Number(apiStats.averageRating || 0),
             earnings: Number(m.earnings)
           })).slice(0, 6),
          timeAnalysis: {
            mostProductiveHour: apiStats.mostProductiveHour != null ? `${apiStats.mostProductiveHour}h` : 'N/A',
            averageEventDuration: apiStats.averageEventDuration ? `${apiStats.averageEventDuration.toFixed(1)}h` : 'N/A',
            workingDaysPerMonth: Math.round((apiStats.workingDaysPerMonth || 0) * 10) / 10
          }
        };
        
        setReportData(report);
      } catch (error) {
        logger.error('Erro ao buscar dados de relatórios:', 'CollaboratorReportsPage', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [selectedPeriod]);

  if (loading) {
    return (
      <CollaboratorLayout 
        title="Relatórios de Performance"
        breadcrumbs={[
          { name: 'Colaborador', href: '/collaborator' },
          { name: 'Relatórios' }
        ]}
      >
        <BrandLoader size={120} label="Carregando relatórios..." />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        </div>

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

              <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-indigo-900">Dias Trabalhados</p>
                    <p className="text-sm text-indigo-700">Média mensal</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-indigo-900">
                  {reportData?.timeAnalysis?.workingDaysPerMonth || 0} dias
                </p>
              </div>
            </div>
          </SimpleCard>

          {/* Exportar dados */}
          <SimpleCard title="Exportar Dados">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Baixe os dados mensais de eventos, avaliação e ganhos exibidos acima em uma planilha CSV.
              </p>
              <button
                onClick={() => downloadMonthlyReportCsv(reportData?.monthly || [])}
                disabled={!reportData?.monthly?.length}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Exportar Dados de Performance (CSV)
              </button>
            </div>
          </SimpleCard>
        </div>
      </div>
    </CollaboratorLayout>
  );
};

export default CollaboratorReportsPage;