import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { CollaboratorLoading, CollaboratorError } from '../../components/collaborator/CollaboratorStates';
import { StatsCard, SimpleCard } from '../../components/ui/Cards';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import {
  Clock,
  Target,
  Star,
  TrendingUp,
  Download,
  Calendar
} from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
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

type Period = '3' | '6' | '12';

const BREADCRUMBS = [
  { name: 'Colaborador', href: '/colaborador/painel' },
  { name: 'Relatórios' },
];

const PERIOD_OPTIONS = [
  { value: '3', label: 'Últimos 3 meses' },
  { value: '6', label: 'Últimos 6 meses' },
  { value: '12', label: 'Últimos 12 meses' },
];

// "AAAA-MM" de N meses atrás (inclusive o mês atual).
const monthCutoff = (months: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - (months - 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
};

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

const axisTick = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };

const CollaboratorReportsPage: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('6');

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      // Buscar dados reais da API
      const response = await collaboratorProfileAPI.getStats();
      const apiStats = (response.data?.data ?? response.data) as CollaboratorStatsResponse;

      // Mapa mês -> avaliação média real (histórico mensal, ver collaboratorRepository.getMonthlyRatings)
      const ratingsByMonth = new Map<string, number>(
        asArray<{ month: string; averageRating: number }>(apiStats?.monthlyRatings).map((r) => [r.month, Number(r.averageRating)])
      );

      const report: ReportData = {
        performance: {
          eventsCompleted: Number(apiStats.totalEvents || 0),
          completionRate: Number(apiStats.completionRate || 0),
          averageRating: Number(apiStats.averageRating || 0),
        },
        // Ganhos mensais do backend (últimos 12 meses) — avaliação mensal real quando existir para o
        // mês, senão cai na média geral (ex.: mês sem nenhuma avaliação registrada ainda).
        monthly: asArray<{ month: string; events: number; earnings: number }>(apiStats?.monthlyEarnings)
          .map((m) => ({
            month: m.month,
            events: Number(m.events),
            rating: ratingsByMonth.get(m.month) ?? Number(apiStats.averageRating || 0),
            earnings: Number(m.earnings)
          }))
          .sort((a, b) => a.month.localeCompare(b.month)),
        timeAnalysis: {
          mostProductiveHour: apiStats.mostProductiveHour != null ? `${apiStats.mostProductiveHour}h` : 'Sem dados',
          averageEventDuration: apiStats.averageEventDuration ? `${apiStats.averageEventDuration.toFixed(1)}h` : 'Sem dados',
          workingDaysPerMonth: Math.round((apiStats.workingDaysPerMonth || 0) * 10) / 10
        }
      };

      setReportData(report);
    } catch (err) {
      logger.error('Erro ao buscar dados de relatórios:', 'CollaboratorReportsPage', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Achado (auditoria): o seletor de período refazia a mesma busca e o gráfico mostrava sempre
  // os mesmos 6 registros. Agora filtra os meses já carregados pelo período escolhido.
  const monthly = useMemo(() => {
    const cutoff = monthCutoff(Number(selectedPeriod));
    return (reportData?.monthly || [])
      .filter((m) => m.month >= cutoff)
      .map((m) => ({ ...m, label: formatMonth(m.month) }));
  }, [reportData, selectedPeriod]);

  const averageRating = reportData?.performance?.averageRating || 0;

  return (
    <CollaboratorLayout title="Relatórios de Performance" breadcrumbs={BREADCRUMBS}>
      {loading ? (
        <CollaboratorLoading label="Carregando relatórios…" />
      ) : error || !reportData ? (
        <CollaboratorError message="Não conseguimos carregar seus relatórios de performance." onRetry={fetchReportData} />
      ) : (
        <div className="space-y-8">
          {/* Métricas de Performance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="Eventos Concluídos"
              value={reportData.performance?.eventsCompleted || 0}
              description="Total de eventos finalizados"
              icon={<Calendar className="h-5 w-5" />}
            />

            <StatsCard
              title="Taxa de Conclusão"
              value={`${reportData.performance?.completionRate || 0}%`}
              description="Eventos finalizados com sucesso"
              icon={<Target className="h-5 w-5" />}
            />

            <StatsCard
              title="Avaliação Média"
              value={averageRating ? `${averageRating.toFixed(1)} / 5` : 'Sem avaliações'}
              description="Nota média dos clientes"
              icon={<Star className="h-5 w-5" />}
            />
          </div>

          {/* Performance Mensal */}
          <SimpleCard
            title="Performance Mensal"
            headerRight={
              <div className="w-44">
                <Select
                  size="sm"
                  options={PERIOD_OPTIONS}
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as Period)}
                  aria-label="Período do relatório"
                />
              </div>
            }
          >
            {monthly.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">Nenhum evento concluído neste período.</p>
            ) : (
              <div className="h-80">
                {/* Achado: era um <LineChart> com <Bar> dentro — o Recharts não desenha barras num
                    LineChart, então a contagem de eventos nunca aparecia. */}
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} stroke="hsl(var(--border))" />
                    <YAxis yAxisId="left" allowDecimals={false} tick={axisTick} stroke="hsl(var(--border))" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 5]} tick={axisTick} stroke="hsl(var(--border))" />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'events') return [value, 'Eventos'];
                        if (name === 'rating') return [`${Number(value).toFixed(1)} / 5`, 'Avaliação'];
                        return [value, name];
                      }}
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--card-foreground))',
                      }}
                    />
                    <Bar yAxisId="left" dataKey="events" fill="hsl(var(--primary))" name="events" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="rating" stroke="hsl(var(--success))" strokeWidth={3} name="rating" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </SimpleCard>

          {/* Análises Detalhadas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SimpleCard title="Análise de Produtividade">
              <div className="space-y-4">
                {[
                  { icon: Clock, title: 'Horário mais produtivo', subtitle: 'Hora de início mais frequente', value: reportData.timeAnalysis?.mostProductiveHour || 'Sem dados' },
                  { icon: TrendingUp, title: 'Duração média', subtitle: 'Tempo médio por evento', value: reportData.timeAnalysis?.averageEventDuration || 'Sem dados' },
                  { icon: Calendar, title: 'Dias trabalhados', subtitle: 'Média mensal', value: `${reportData.timeAnalysis?.workingDaysPerMonth || 0} dias` },
                ].map(({ icon: Icon, title, subtitle, value }) => (
                  <div key={title} className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/40 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{title}</p>
                        <p className="text-sm text-muted-foreground">{subtitle}</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </SimpleCard>

            {/* Exportar dados */}
            <SimpleCard title="Exportar Dados">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Baixe os dados mensais de eventos, avaliação e ganhos do período selecionado em uma planilha CSV.
                </p>
                <Button
                  size="sm"
                  fullWidth
                  onClick={() => downloadMonthlyReportCsv(monthly)}
                  disabled={!monthly.length}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Exportar dados de performance (CSV)
                </Button>
              </div>
            </SimpleCard>
          </div>
        </div>
      )}
    </CollaboratorLayout>
  );
};

export default CollaboratorReportsPage;
