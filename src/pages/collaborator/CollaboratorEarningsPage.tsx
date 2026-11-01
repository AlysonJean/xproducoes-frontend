import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { CollaboratorLoading, CollaboratorError } from '../../components/collaborator/CollaboratorStates';
import { StatsCard, SimpleCard } from '../../components/ui/Cards';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import type { StandardVariant } from '../../components/ui/StandardTypes';
import { formatPrice } from '@/utils/formatPrice';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  Download,
  Banknote,
  PiggyBank
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { collaboratorsAPI, collaboratorProfileAPI } from '../../services/api';
import { logger } from '../../utils/logger';

type PaymentStatus = 'PAID' | 'PENDING' | 'PROCESSING' | 'OVERDUE' | 'CANCELLED' | 'DISPUTED' | 'ABERTO' | 'ATRASADO' | 'CANCELADO';

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
    status: PaymentStatus;
  }>;
}

interface RawStatsResponse {
  monthlyEarnings?: Array<{ month: string; earnings: number; events: number }>;
  totalEarnings?: number;
  totalEvents?: number;
}

interface RawPaymentRecord {
  id: string;
  description?: string;
  amount: number;
  dueDate?: string;
  paymentDate?: string;
  status: PaymentStatus;
}

const BREADCRUMBS = [
  { name: 'Colaborador', href: '/colaborador/painel' },
  { name: 'Ganhos' },
];

const PERIOD_OPTIONS = [
  { value: '6', label: 'Últimos 6 meses' },
  { value: '12', label: 'Últimos 12 meses' },
];

// Achado (auditoria): só PAID/PENDING/PROCESSING tinham rótulo — ATRASADO, ABERTO, CANCELADO (e os
// valores do enum do backend OVERDUE/CANCELLED/DISPUTED) apareciam como "Desconhecido".
const PAYMENT_STATUS: Record<string, { label: string; variant: StandardVariant }> = {
  PAID: { label: 'Pago', variant: 'success' },
  PENDING: { label: 'Pendente', variant: 'warning' },
  ABERTO: { label: 'Em aberto', variant: 'warning' },
  PROCESSING: { label: 'Processando', variant: 'info' },
  OVERDUE: { label: 'Atrasado', variant: 'destructive' },
  ATRASADO: { label: 'Atrasado', variant: 'destructive' },
  DISPUTED: { label: 'Em contestação', variant: 'warning' },
  CANCELLED: { label: 'Cancelado', variant: 'ghost' },
  CANCELADO: { label: 'Cancelado', variant: 'ghost' },
};

// "AAAA-MM" de N meses atrás (inclusive o mês atual), para filtrar o período do gráfico.
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

const formatPaymentDate = (value: string) => {
  if (!value) return 'Sem data';
  const d = new Date(value);
  return isNaN(d.getTime()) ? 'Sem data' : d.toLocaleDateString('pt-BR');
};

// Substitui o botão "Exportar" que não tinha handler algum (achado de auditoria).
function downloadMonthlyEarningsCsv(rows: Array<{ month: string; events: number; earnings: number }>) {
  const header = 'Mês,Eventos,Ganhos (R$)';
  const lines = rows.map((r) => `${r.month},${r.events},${r.earnings.toFixed(2)}`);
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([String.fromCharCode(0xfeff) + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ganhos-mensais-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const axisTick = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };

const CollaboratorEarningsPage: React.FC = () => {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'6' | '12'>('6');
  const [showAllPayments, setShowAllPayments] = useState(false);

  const fetchEarnings = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);

      // Buscar estatísticas e pagamentos reais
      const [statsResult, paymentsResult] = await Promise.allSettled([
        collaboratorProfileAPI.getStats(),
        collaboratorsAPI.getMyPayments() // Mapeado para /me/payments
      ]);

      // As duas chamadas falharam: é erro, não "nenhum ganho".
      if (statsResult.status === 'rejected' && paymentsResult.status === 'rejected') {
        throw statsResult.reason;
      }

      const stats = statsResult.status === 'fulfilled'
        ? (statsResult.value.data?.data ?? statsResult.value.data) as RawStatsResponse
        : null;
      const payments = paymentsResult.status === 'fulfilled'
        ? (paymentsResult.value.data?.data ?? paymentsResult.value.data) as RawPaymentRecord[]
        : null;

      // Processar dados mensais para o gráfico — o backend retorna month no formato "YYYY-MM"
      // (últimos 12 meses, do mais recente ao mais antigo); o gráfico mostra em ordem cronológica.
      const monthlyData = (stats?.monthlyEarnings?.map((item) => ({
        month: item.month,
        earnings: Number(item.earnings),
        events: Number(item.events)
      })) || []).sort((a, b) => a.month.localeCompare(b.month));

      // Calcular ganhos anuais (soma dos últimos 12 meses)
      const yearlyEarnings = monthlyData.reduce((acc, item) => acc + item.earnings, 0);

      // Calcular ganho do mês atual
      // Mês LOCAL: toISOString() é UTC — depois das 21h do último dia do mês já dava o mês seguinte.
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // "YYYY-MM"
      const currentMonthData = monthlyData.find((d) => d.month === currentMonth);

      // Mapear pagamentos recentes
      const recentPayments = Array.isArray(payments) ? payments.slice(0, 10).map((p) => ({
        id: p.id,
        eventTitle: p.description || 'Pagamento',
        amount: Number(p.amount),
        date: p.dueDate || p.paymentDate || '',
        status: p.status
      })) : [];

      // Calcular pendentes
      const pendingTotal = Array.isArray(payments)
        ? payments.filter((p) => p.status === 'PENDING').reduce((acc, p) => acc + Number(p.amount), 0)
        : 0;

      setEarnings({
        totalEarnings: Number(stats?.totalEarnings || 0),
        monthlyEarnings: currentMonthData ? currentMonthData.earnings : 0,
        yearlyEarnings,
        pendingPayments: pendingTotal,
        averagePerEvent: stats && stats.totalEvents && stats.totalEvents > 0 ? Number(stats.totalEarnings) / Number(stats.totalEvents) : 0,
        eventsCompleted: Number(stats?.totalEvents || 0),
        earningsGrowth: 0, // Backend não fornece ainda comparativo com mês anterior
        monthlyData,
        recentPayments
      });
    } catch (err) {
      logger.error('Erro ao buscar dados de ganhos:', 'CollaboratorEarningsPage', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  // Achado (auditoria): o seletor de período só repetia a mesma busca — o gráfico não mudava.
  // Agora filtra os meses já carregados (o backend devolve os últimos 12).
  const chartData = useMemo(() => {
    const cutoff = monthCutoff(Number(selectedPeriod));
    return (earnings?.monthlyData || [])
      .filter((m) => m.month >= cutoff)
      .map((m) => ({ ...m, label: formatMonth(m.month) }));
  }, [earnings, selectedPeriod]);

  const visiblePayments = showAllPayments ? earnings?.recentPayments : earnings?.recentPayments?.slice(0, 5);

  return (
    <CollaboratorLayout title="Ganhos e Receitas" breadcrumbs={BREADCRUMBS}>
      {loading ? (
        <CollaboratorLoading label="Carregando seus ganhos…" />
      ) : error || !earnings ? (
        <CollaboratorError message="Não conseguimos carregar seus ganhos e pagamentos." onRetry={fetchEarnings} />
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Métricas Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Geral"
              value={formatPrice(earnings.totalEarnings || 0)}
              description="Ganhos acumulados"
              icon={<DollarSign className="h-5 w-5" />}
              trend={earnings.earningsGrowth ? {
                value: earnings.earningsGrowth,
                type: earnings.earningsGrowth > 0 ? 'positive' : 'negative'
              } : undefined}
            />

            <StatsCard
              title="Este Mês"
              value={formatPrice(earnings.monthlyEarnings || 0)}
              description="Receita do mês atual"
              icon={<Calendar className="h-5 w-5" />}
            />

            <StatsCard
              title="Média por Evento"
              value={formatPrice(earnings.averagePerEvent || 0)}
              description="Valor médio recebido"
              icon={<TrendingUp className="h-5 w-5" />}
            />

            <StatsCard
              title="Pagamentos Pendentes"
              value={formatPrice(earnings.pendingPayments || 0)}
              description="Aguardando processamento"
              icon={<Clock className="h-5 w-5" />}
            />
          </div>

          {/* Gráfico de Ganhos */}
          <SimpleCard title="Evolução dos Ganhos">
            {/* Controles no corpo do card (no cabeçalho, ao lado do título, estouravam a 375px). */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="w-44">
                <Select
                  size="sm"
                  options={PERIOD_OPTIONS}
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as '6' | '12')}
                  aria-label="Período do gráfico"
                />
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => downloadMonthlyEarningsCsv(chartData)}
                disabled={!chartData.length}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Exportar
              </Button>
            </div>
            {chartData.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">Nenhum ganho registrado neste período.</p>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} stroke="hsl(var(--border))" />
                    <YAxis tick={axisTick} stroke="hsl(var(--border))" />
                    <Tooltip
                      formatter={(value: number | undefined, name: string | undefined) => [
                        formatPrice(Number(value || 0)),
                        name === 'earnings' ? 'Ganhos' : 'Eventos'
                      ]}
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--card-foreground))',
                      }}
                    />
                    <Bar dataKey="earnings" fill="hsl(var(--primary))" name="earnings" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SimpleCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pagamentos Recentes */}
            <SimpleCard
              title="Pagamentos Recentes"
              headerRight={
                (earnings.recentPayments?.length || 0) > 5 && (
                  <Button size="sm" variant="ghost" onClick={() => setShowAllPayments((prev) => !prev)}>
                    {showAllPayments ? 'Ver menos' : 'Ver todos'}
                  </Button>
                )
              }
            >
              {!visiblePayments || visiblePayments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <Banknote className="w-7 h-7 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <p className="text-muted-foreground">Nenhum pagamento registrado ainda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visiblePayments.map((payment) => {
                    const status = PAYMENT_STATUS[payment.status] ?? { label: payment.status || 'Sem status', variant: 'ghost' as StandardVariant };
                    return (
                      <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 shrink-0 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Banknote className="w-5 h-5 text-primary" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{payment.eventTitle}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatPaymentDate(payment.date)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">
                            {formatPrice(payment.amount)}
                          </p>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SimpleCard>

            {/* Resumo Financeiro */}
            <SimpleCard title="Resumo Financeiro">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-success/10 rounded-lg border border-success/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                      <PiggyBank className="w-5 h-5 text-success" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Total Recebido</p>
                      <p className="text-sm text-muted-foreground">Pagamentos confirmados</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {formatPrice(((earnings.totalEarnings || 0) - (earnings.pendingPayments || 0)))}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-warning/10 rounded-lg border border-warning/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-warning" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Aguardando</p>
                      <p className="text-sm text-muted-foreground">Pagamentos pendentes</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {formatPrice(earnings.pendingPayments || 0)}
                  </p>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">Eventos Concluídos</span>
                    <span className="text-lg font-bold text-foreground">{earnings.eventsCompleted || 0}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-medium text-foreground">Média por Evento</span>
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(earnings.averagePerEvent || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </SimpleCard>
          </div>
        </div>
      )}
    </CollaboratorLayout>
  );
};

export default CollaboratorEarningsPage;
