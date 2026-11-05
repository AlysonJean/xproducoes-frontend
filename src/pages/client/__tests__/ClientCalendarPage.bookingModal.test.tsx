import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/api', () => ({ apiFetch: vi.fn() }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));

import { BookingDetailsModal } from '../ClientCalendarPage';
import { formatBookingTotal } from '../../../utils/formatPrice';

const inicio = new Date('2027-01-10T21:00:00.000Z');
const abrir = (booking: object) =>
  render(
    <MemoryRouter>
      <BookingDetailsModal
        event={{ title: 'Evento', start: inicio, end: inicio, resource: { eventDate: inicio.toISOString(), status: 'PENDING', ...booking } } as never}
        onClose={vi.fn()}
      />
    </MemoryRouter>,
  );

// Achado (auditoria ponta a ponta): a janela da reserva cortava o código ("#XP-JOAO-") e mostrava
// "R$ 0,00" no pedido ainda sem valor, como o do briefing, que chega sem itens.
describe('Agenda do cliente: janela da reserva', () => {
  it('mostra o código inteiro do pedido', () => {
    abrir({ id: 'XP-JOAO-20261120-1900-H04', totalPrice: '300' });

    expect(screen.getByText('#XP-JOAO-20261120-1900-H04')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*300,00/)).toBeInTheDocument();
  });

  it('id antigo (cuid) segue nos 8 primeiros caracteres', () => {
    abrir({ id: 'ckabcdefgh12345', totalPrice: '300' });

    expect(screen.getByText('#ckabcdef')).toBeInTheDocument();
  });

  it('pedido sem valor aparece "Em preparação", não "R$ 0,00"', () => {
    abrir({ id: 'XP-ANA-1', totalPrice: '0' });

    expect(screen.getByText('Em preparação')).toBeInTheDocument();
    expect(screen.queryByText(/R\$\s*0,00/)).toBeNull();
  });
});

describe('formatBookingTotal', () => {
  it.each([[null], [undefined], [0], ['0'], ['0.00'], ['abc']])('%s vira "Em preparação"', (valor) => {
    expect(formatBookingTotal(valor as never)).toBe('Em preparação');
  });

  it.each([[300, /300,00/], ['1500.5', /1\.500,50/]])('%s mostra o valor', (valor, esperado) => {
    expect(formatBookingTotal(valor)).toMatch(esperado);
  });
});
