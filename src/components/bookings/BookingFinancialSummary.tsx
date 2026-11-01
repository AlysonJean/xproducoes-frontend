import React from 'react';
import { BookingDetails } from '@/types/types';
import { DollarSign, TrendingUp, Users, Package } from 'lucide-react';
import { formatPrice } from '@/utils/formatPrice';

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

export const BookingFinancialSummary: React.FC<BookingFinancialSummaryProps> = ({ booking }) => {
  // Cálculo de Receita
  const revenue = Number(booking.totalPrice || 0);

  // Cálculo de Custos de Equipe
  const collaboratorsCost = (booking.eventCollaborators || []).reduce((acc, curr) => {
    // Usa totalPayment se existir
    if (curr.totalPayment) return acc + Number(curr.totalPayment);

    // Fallback: Tenta calcular baseado em horas e taxa
    // Se hourlyRate não estiver explícito na atribuição, teria que pegar do colaborador, mas vamos assumir 0 no fallback seguro
    if (curr.totalHours && curr.hourlyRate) { // hourlyRate não está tipado diretamente no eventCollaborator da interface bookingDetails, mas vamos checar
        return acc + (Number(curr.totalHours) * Number(curr.hourlyRate || 0));
    }

    return acc;
  }, 0);

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
        <span className={`px-3 py-1 rounded-full text-sm font-bold border ${tone}`}>
          Margem: {margin.toFixed(1)}%
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Receita */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
            <Package className="w-4 h-4" /> Receita total
          </p>
          <p className="text-xl font-bold text-foreground break-words">
            {formatPrice(revenue)}
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
            {booking.eventCollaborators?.length || 0} colaboradores
          </p>
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
