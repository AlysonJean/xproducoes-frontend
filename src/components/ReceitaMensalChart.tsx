import { useEffect, useState } from 'react';
import { Select } from './ui/StandardComponents';
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

interface ReceitaMensalChartProps {
  year: number;
}

export function ReceitaMensalChart({ year }: ReceitaMensalChartProps) {
  const [data, setData] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(year);

  // Buscar anos disponíveis ao montar
  useEffect(() => {
    apiFetch<number[]>(`/dashboard/available-years`)
      .then((res) => {
        // Garante que é array de números
        let anos = Array.isArray(res) ? res.map(Number) : [];
        // Adiciona o ano inicial se não estiver presente
        if (!anos.includes(year)) {
          anos.push(year);
        }
        // Remove duplicidades e ordena decrescente
        anos = Array.from(new Set(anos)).sort((a, b) => b - a);
        setYears(anos);
      })
      .catch(() => {
        // fallback: mostra apenas o ano inicial
        setYears([year]);
      });
  }, [year]);

  // Buscar dados do ano selecionado
  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<MonthlyRevenue[]>(`/dashboard/monthly-revenue?year=${selectedYear}`)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Erro desconhecido ao carregar o gráfico.');
        }
      })
      .finally(() => setLoading(false));
  }, [selectedYear]);

  // Select de anos
  const yearOptions = years.map(y => ({ value: String(y), label: String(y) }));

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Select
        label="Ano"
        options={yearOptions}
        value={String(selectedYear)}
        onChange={e => setSelectedYear(Number(e.target.value))}
        className="max-w-xs"
      />
      <div className="text-muted-foreground">Carregando gráfico...</div>
    </div>
  );


  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Select
          label="Ano"
          options={yearOptions}
          value={String(selectedYear)}
          onChange={e => setSelectedYear(Number(e.target.value))}
          className="max-w-xs"
        />
        <div className="text-destructive-foreground text-center">
          Erro ao carregar o gráfico: {error}
          <br />
          <span className="text-xs text-muted-foreground">Verifique sua autenticação ou tente novamente.</span>
        </div>
      </div>
    );
  }


  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Select
          label="Ano"
          options={yearOptions}
          value={String(selectedYear)}
          onChange={e => setSelectedYear(Number(e.target.value))}
          className="max-w-xs"
        />
        <div className="text-muted-foreground text-center">
          Nenhum dado de receita mensal encontrado para o período.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Select
        label="Ano"
        options={yearOptions}
        value={String(selectedYear)}
        onChange={e => setSelectedYear(Number(e.target.value))}
        className="max-w-xs mb-2"
      />
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data.map(d => ({ ...d, label: monthLabels[d.month] }))}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="label" 
            axisLine={false}
            tickLine={false}
            className="text-xs fill-muted-foreground"
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
            className="text-xs fill-muted-foreground"
          />
          <Tooltip 
            formatter={(value: number) => [
              Number(value).toLocaleString('pt-BR', { 
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
          />
          <Bar 
            dataKey="total" 
            name="Receita" 
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            className="hover:opacity-80 transition-opacity"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
