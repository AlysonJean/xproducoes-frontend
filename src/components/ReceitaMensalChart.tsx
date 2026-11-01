import { useEffect, useState, type ReactNode } from 'react';
import { Select, Alert, Button, Skeleton } from './ui/StandardComponents';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { apiFetch } from '../services/api';

interface MonthlyRevenue {
  month: number;
  year: number;
  total: number;
}

const monthLabels = [
  '', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

// Eixos e grade com as cores do tema (o padrão do Recharts é cinza fixo #666/#ccc).
const AXIS_TICK = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };

interface ReceitaMensalChartProps {
  year: number;
}

export function ReceitaMensalChart({ year }: ReceitaMensalChartProps) {
  const [data, setData] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(year);
  const [reloadKey, setReloadKey] = useState(0);

  // Buscar anos disponíveis ao montar
  useEffect(() => {
  (async () => {
    try {
      const res = await apiFetch<number[]>(`/dashboard/available-years`);
      // Garante que é array de números
      let anos = Array.isArray(res) ? res.map(Number) : [];
      // Adiciona o ano inicial se não estiver presente
      if (!anos.includes(year)) {
        anos.push(year);
      }
      // Remove duplicidades e ordena decrescente
      anos = Array.from(new Set(anos)).sort((a, b) => b - a);
      setYears(anos);
    } catch {
      // fallback: mostra apenas o ano inicial
      setYears([year]);
    }
  })();
  }, [year]);

  // Buscar dados do ano selecionado
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Defere para não chamar setState de forma síncrona no corpo do efeito
      // (react-hooks/set-state-in-effect) — resolve antes do próximo paint.
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<MonthlyRevenue[]>(`/dashboard/monthly-revenue?year=${selectedYear}`);
        if (!cancelled) setData(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error) setError(err.message);
        else setError('Erro desconhecido ao carregar o gráfico.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedYear, reloadKey]);

  // Select de anos
  const yearOptions = years.map(y => ({ value: String(y), label: String(y) }));

  // O seletor de ano fica sempre no topo; só o conteúdo abaixo muda conforme o estado.
  let content: ReactNode;
  if (loading) {
    content = <Skeleton className="h-[300px] w-full" />;
  } else if (error) {
    // Antes: texto em `text-destructive-foreground` (branco) sobre o card — invisível no tema claro.
    content = (
      <Alert
        variant="error"
        title="Erro ao carregar o gráfico"
        description={error}
        action={<Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>Tentar de novo</Button>}
      />
    );
  } else if (!data || data.length === 0) {
    content = (
      <p className="h-40 flex items-center justify-center text-sm text-muted-foreground text-center">
        Nenhuma receita registrada em {selectedYear}.
      </p>
    );
  } else {
    content = (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data.map(d => ({ ...d, label: monthLabels[d.month] }))}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={AXIS_TICK}
          />
          <YAxis
            domain={[0, 'auto']} // mínimo 0, máximo automático
            tickFormatter={(value: number) => value.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}
            axisLine={false}
            tickLine={false}
            tick={AXIS_TICK}
          />
          <Tooltip
            formatter={(value: number | undefined) => [
              Number(value || 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }),
              'Receita'
            ]}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
            cursor={{ fill: 'hsl(var(--muted))' }}
          />
          <Bar
            dataKey="total"
            name="Receita"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-xs">
        <Select
          label="Ano"
          size="sm"
          options={yearOptions}
          value={String(selectedYear)}
          onChange={e => setSelectedYear(Number(e.target.value))}
        />
      </div>
      {content}
    </div>
  );
}
