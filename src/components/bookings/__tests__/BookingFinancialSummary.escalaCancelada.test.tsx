import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookingFinancialSummary } from '../BookingFinancialSummary';
import type { BookingDetails } from '@/types/types';

// Decisão de Alyson (12/11/2026), "o padrão dos grandes aplicativos": escala cancelada não é equipe. Com a "Desativar
// acesso", a escala cancelada fica na reserva (com o selo "Escala cancelada" em "Colaboradores atribuídos") e entrava no
// "Custo de equipe", na contagem de colaboradores e no lucro estimado da ficha.
const escala = (status: string, totalPayment: number) => ({ id: `ec-${status}`, status, totalPayment });
const reserva = (eventCollaborators: ReturnType<typeof escala>[]) =>
  ({ id: 'b1', totalPrice: 2000, eventCollaborators }) as unknown as BookingDetails;
const valor = (rotulo: string) => {
  const caixa = screen.getByText(rotulo).closest('div') as HTMLElement;
  return (caixa.querySelector('p.text-xl')?.textContent ?? '').replace(/\s/g, ' ');
};

describe('BookingFinancialSummary — escala cancelada fora do custo (decisão de 12/11/2026)', () => {
  it('custo, contagem e lucro só com a escala ativa; a cancelada e a de quem não compareceu ficam de fora', () => {
    render(
      <BookingFinancialSummary
        booking={reserva([
          escala('ASSIGNED', 100),
          escala('CONFIRMED', 200),
          escala('IN_PROGRESS', 300),
          escala('COMPLETED', 400),
          escala('CANCELLED', 500),
          escala('NO_SHOW', 600),
        ])}
      />,
    );

    expect(valor('Custo de equipe')).toMatch(/1\.000,00/);
    expect(screen.getByText('4 colaboradores')).toBeInTheDocument();
    expect(valor('Lucro estimado')).toMatch(/1\.000,00/);
    expect(screen.getByText('Margem: 50.0%')).toBeInTheDocument();
  });

  it('só com escala cancelada: custo zero e nenhum colaborador', () => {
    render(<BookingFinancialSummary booking={reserva([escala('CANCELLED', 500)])} />);

    expect(valor('Custo de equipe')).toMatch(/0,00/);
    expect(screen.getByText('0 colaboradores')).toBeInTheDocument();
    expect(screen.getByText('Margem: 100.0%')).toBeInTheDocument();
  });

  it('sem escala cancelada: o mesmo resumo de antes', () => {
    render(<BookingFinancialSummary booking={reserva([escala('CONFIRMED', 300), escala('COMPLETED', 200)])} />);

    expect(valor('Custo de equipe')).toMatch(/500,00/);
    expect(screen.getByText('2 colaboradores')).toBeInTheDocument();
    expect(screen.getByText('Margem: 75.0%')).toBeInTheDocument();
  });
});
