import React from 'react';
import { BookingDetails } from '@/types/types';
import { DollarSign, TrendingUp, Users, Package } from 'lucide-react';
import { formatBookingTotal, formatPrice } from '@/utils/formatPrice';
import { isActiveAssignmentStatus } from '@/utils/assignmentStatus';

interface BookingFinancialSummaryProps {
  booking: BookingDetails;
}

// Margem → tom de status (tokens; antes `text-emerald-600 bg-emerald-50 border-emerald-200` etc.,
// caixas claras fixas que ficavam estouradas no tema escuro).
const getMarginTone = (m: number) => {
  if (m >= 50) return 'text-success bg-success/10 border-success/20';
  if (m >= 20) return 'text-info bg-info/10 border-info/20';
  if (m > 0) return 'text-warning bg-warning/10 border-warning/20';
  return 'text-destructive bg-destructive/10 border-destructive/20';
};

// Auditoria do orçamento (12/11/2026), O16 (exibição): o custo de cada escala. Os valores chegam do banco como texto
// ("300.00", "0.00"). Antes, um totalPayment "0.00" (texto não vazio) contava como preenchido e escondia o valor por
// hora × horas que o "Alocar equipe e confirmar" manda; e a escala só com cachê fixo (fixedRate) ficava fora do custo.
// Ordem: o total gravado; sem ele, valor por hora × horas; sem os dois, o cachê fixo.
type CrewCostFields = { totalPayment?: unknown; hourlyRate?: unknown; totalHours?: unknown; fixedRate?: unknown };
const amount = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const assignmentCost = (assignment: CrewCostFields): number => {
  const total = amount(assignment.totalPayment);
  if (total > 0) return total;
  const byHour = Math.round(amount(assignment.hourlyRate) * amount(assignment.totalHours) * 100) / 100;
  if (byHour > 0) return byHour;
  return amount(assignment.fixedRate);
};

export const BookingFinancialSummary: React.FC<BookingFinancialSummaryProps> = ({ booking }) => {
  // Cálculo de Receita
  const revenue = Number(booking.totalPrice || 0);

  // Decisão de Alyson (12/11/2026): escala cancelada (ou "não compareceu") não é equipe. Fica de fora do custo e da
  // contagem; a linha continua em "Colaboradores atribuídos", com o selo "Escala cancelada".
  const crew = (booking.eventCollaborators || []).filter((assignment) => isActiveAssignmentStatus(assignment.status));

  // Cálculo de Custos de Equipe (O16: total gravado, valor por hora × horas ou cachê fixo; ver assignmentCost)
  const collaboratorsCost = crew.reduce((acc, curr) => acc + assignmentCost(curr), 0);
  // Escala ativa sem valor nenhum: o custo dela entra como R$ 0, e a ficha avisa.
  const crewWithoutCost = crew.filter((assignment) => assignmentCost(assignment) === 0).length;

  // Custos de Equipamentos (fixo ou estimado? Por enquanto 0, futuramente pode vir do cadastro de equipment.replacementCost se quebrar, mas aqui é custo operacional?)
  // Vamos considerar custo 0 para equipamentos próprios por enquanto, ou adicionar campo no futuro.
  const equipmentCost = 0;

  const totalCost = collaboratorsCost + equipmentCost;
  const profit = revenue - totalCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const tone = getMarginTone(margin);

  // Sem moldura própria: o componente fica dentro do card "Valor da reserva" da ficha (antes era
  // card dentro de card). Uma coluna só — a ficha o mostra na coluna lateral (~240px em telas lg),
  // onde as 3 colunas de `md:grid-cols-3` com preço em text-2xl estouravam.
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Financeiro
        </h4>
        {/* O3: sem valor da reserva ("Em preparação") não há margem a mostrar (antes, "Margem: 0.0%" em vermelho). */}
        {revenue > 0 && (
          <span className={`px-3 py-1 rounded-full text-sm font-bold border ${tone}`}>
            Margem: {margin.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Receita */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
            <Package className="w-4 h-4" /> Receita total
          </p>
          <p className="text-xl font-bold text-foreground break-words">
            {formatBookingTotal(revenue)}
          </p>
        </div>

        {/* Custos */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
            <Users className="w-4 h-4" /> Custo de equipe
          </p>
          <p className="text-xl font-bold text-destructive break-words">
            - {formatPrice(collaboratorsCost)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {crew.length} colaboradores
          </p>
          {crewWithoutCost > 0 && (
            <p className="text-xs text-warning mt-1">
              {crewWithoutCost === 1 ? '1 sem valor definido' : `${crewWithoutCost} sem valor definido`} (entra como R$ 0,00)
            </p>
          )}
        </div>

        {/* Lucro */}
        <div className={`p-4 rounded-lg border ${tone}`}>
          <p className="text-sm mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Lucro estimado
          </p>
          <p className="text-xl font-bold break-words">
            {formatPrice(profit)}
          </p>
        </div>
      </div>
    </div>
  );
};
