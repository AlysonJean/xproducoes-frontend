import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { Booking } from '../../../types/types';

const { apiFetch, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));

import { AdminBookingForm } from '../AdminBookingForm';

// Onda 2b da auditoria do status da reserva (D8): o pagamento "Devolvido" vem do reembolso registrado (Reembolsada,
// pela lista). No formulário ele não se escolhe; na reserva reembolsada é a única opção e segue no envio (o servidor
// aceita o mesmo valor e recusa trocar).

const RESERVA = {
  id: 'XP-DIGITADO', eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T02:00:00.000Z',
  clientId: null, client: null, clientName: 'Ana Souza', clientContact: '31988887777', clientEmail: 'ana@cliente.test',
  location: 'Espaço VIP', street: 'Av. Brasil', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG', zipCode: '30110-000', addressNumber: '123',
  status: 'CONFIRMED', deliveryStatus: 'PENDING', totalPrice: 500, paymentStatus: 'PAID',
} as unknown as Booking;

const opcoes = () => within(screen.getByLabelText('Situação do Pagamento')).getAllByRole('option').map((o) => o.textContent);

describe('AdminBookingForm — pagamento "Devolvido" (onda 2b, D8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    apiFetch.mockImplementation((_url: string, opts?: { method?: string }) =>
      Promise.resolve(opts?.method === 'PUT' ? { id: RESERVA.id } : []));
  });

  it('reserva comum: "Devolvido" não está entre as opções', async () => {
    render(<AdminBookingForm initialData={RESERVA} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Salvar alterações' });

    expect(opcoes()).toEqual(['Não informado', 'Pendente', 'Parcial', 'Pago']);
  });

  it('reserva reembolsada: só "Devolvido", com a explicação; salvar manda o mesmo valor', async () => {
    const onSuccess = vi.fn();
    render(
      <AdminBookingForm initialData={{ ...RESERVA, status: 'REFUNDED', paymentStatus: 'REFUNDED' } as unknown as Booking} onSuccess={onSuccess} onCancel={vi.fn()} />,
    );
    await screen.findByRole('button', { name: 'Salvar alterações' });

    expect(opcoes()).toEqual(['Devolvido']);
    expect(screen.getByLabelText('Situação do Pagamento')).toHaveValue('REFUNDED');
    expect(screen.getByText('Reserva reembolsada. Para mudar, volte a reserva para Cancelada na lista.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const put = apiFetch.mock.calls.find(([, opts]) => opts?.method === 'PUT');
    expect(JSON.parse(String(put?.[1].body)).paymentStatus).toBe('REFUNDED');
  });
});
