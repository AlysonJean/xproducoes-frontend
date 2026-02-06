import React from 'react';
import { BookingDetails } from '@/types/types';
import { DollarSign, TrendingUp, Users, Package } from 'lucide-react';
import { formatPrice } from '@/utils/formatPrice';

interface BookingFinancialSummaryProps {
  booking: BookingDetails;
}

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

  const getMarginColor = (m: number) => {
    if (m >= 50) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (m >= 20) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (m > 0) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Financeiro da Reserva
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getMarginColor(margin)}`}>
          Margem: {margin.toFixed(1)}%
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Receita */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
            <Package className="w-4 h-4" /> Receita Total
          </p>
          <p className="text-2xl font-bold text-foreground">
            {formatPrice(revenue)}
          </p>
        </div>

        {/* Custos */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
            <Users className="w-4 h-4" /> Custo de Equipe
          </p>
          <p className="text-2xl font-bold text-destructive">
            - {formatPrice(collaboratorsCost)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {booking.eventCollaborators?.length || 0} colaboradores
          </p>
        </div>

        {/* Lucro */}
        <div className={`p-4 rounded-lg border ${getMarginColor(margin)}`}>
          <p className="text-sm opacity-80 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Lucro Estimado
          </p>
          <p className="text-2xl font-bold">
            {formatPrice(profit)}
          </p>
        </div>
      </div>
    </div>
  );
};
