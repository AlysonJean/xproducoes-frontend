import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookingFinancialSummary } from '../BookingFinancialSummary';
import type { BookingDetails } from '@/types/types';

// Auditoria do orçamento (12/11/2026), O16 (exibição): "Alocar equipe e confirmar" manda valor por hora e horas, e os
// valores chegam do banco como texto. Um totalPayment "0.00" (texto não vazio) contava como preenchido e escondia o
// valor por hora × horas; a escala só com cachê fixo ficava fora do custo. E o total zero da reserva aparecia "R$ 0,00"
// com "Margem: 0.0%" em vermelho, quando o resto da ficha diz "Em preparação".
const reserva = (totalPrice: string, eventCollaborators: object[]) =>
  ({ id: 'b1', totalPrice, eventCollaborators }) as unknown as BookingDetails;
const valor = (rotulo: string) => {
  const caixa = screen.getByText(rotulo).closest('div') as HTMLElement;
  return (caixa.querySelector('p.text-xl')?.textContent ?? '').replace(/\s/g, ' ');
};

describe('BookingFinancialSummary — custo da equipe e total sem valor', () => {
  it('custo: valor por hora × horas (com total "0.00" gravado), o cachê fixo e o total gravado; avisa quem está sem valor', () => {
    render(
      <BookingFinancialSummary
        booking={reserva('2000.00', [
          { id: 'ec1', status: 'CONFIRMED', totalPayment: '0.00', hourlyRate: '60.00', totalHours: '5.00', fixedRate: '0.00' },
          { id: 'ec2', status: 'CONFIRMED', totalPayment: null, hourlyRate: null, totalHours: null, fixedRate: '250.00' },
          { id: 'ec3', status: 'ASSIGNED', totalPayment: '150.00', hourlyRate: '10.00', totalHours: '4.00', fixedRate: '150.00' },
          { id: 'ec4', status: 'ASSIGNED', totalPayment: '0', hourlyRate: null, totalHours: '4.00', fixedRate: null },
        ])}
      />,
    );

    expect(valor('Custo de equipe')).toMatch(/700,00/);
    expect(valor('Lucro estimado')).toMatch(/1\.300,00/);
    expect(screen.getByText('Margem: 65.0%')).toBeInTheDocument();
    expect(screen.getByText('4 colaboradores')).toBeInTheDocument();
    expect(screen.getByText('1 sem valor definido (entra como R$ 0,00)')).toBeInTheDocument();
  });

  it('reserva ainda sem valor: receita "Em preparação" e sem a margem', () => {
    render(<BookingFinancialSummary booking={reserva('0.00', [])} />);

    expect(valor('Receita total')).toBe('Em preparação');
    expect(screen.queryByText(/^Margem:/)).not.toBeInTheDocument();
  });
});
