import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Booking } from '../../../types/types';

const { apiFetch, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));

import { AdminBookingForm } from '../AdminBookingForm';

const KIT = { id: 'kit00000000000000000001', name: 'Kit Som', price: 100 };

const corpo = (method: string) => {
  const call = apiFetch.mock.calls.find((c) => c[1]?.method === method);
  return call ? (JSON.parse(call[1].body as string) as Record<string, unknown>) : null;
};
const preencher = (campos: Array<[string, string]>) => {
  for (const [label, value] of campos) fireEvent.change(screen.getByLabelText(label), { target: { value } });
};
const NOVA: Array<[string, string]> = [
  ['Nome do Cliente', 'Ana Souza'], ['Contato', '31988887777'], ['Kit', KIT.id],
  ['Início', '2027-01-10T18:00'], ['Término', '2027-01-10T23:00'], ['Local', 'Espaço VIP'], ['Rua', 'Av. Brasil'],
  ['Bairro', 'Centro'], ['Cidade', 'Belo Horizonte'], ['Estado', 'MG'], ['CEP', '30110-000'], ['Número', '123'],
];
const reserva = (extra: Record<string, unknown> = {}) => ({
  id: 'XP-DIGITADO', eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T02:00:00.000Z',
  clientId: null, client: null, clientName: 'Ana Souza', clientContact: '31988887777', clientEmail: 'ana@cliente.test',
  location: 'Espaço VIP', street: 'Av. Brasil', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG',
  zipCode: '30110-000', addressNumber: '123', status: 'CONFIRMED', deliveryStatus: 'PENDING',
  ...extra,
}) as unknown as Booking;

// D8a (aprovada em 02/11/2026): o formulário exigia o "Valor do Serviço" (sem ele não criava nem editava) e o
// mandava como serviceValue, gravado à parte do total — e o total da reserva só de kit nascia R$ 0. Agora o
// campo é "Valor final (R$)", opcional, e vai como totalPrice; em branco, o servidor calcula pelos itens.
describe('AdminBookingForm — "Valor final (R$)" (D8a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (opts?.method === 'POST' || opts?.method === 'PUT') return Promise.resolve({ id: 'XP-NOVA' });
      if (url === '/kits') return Promise.resolve([KIT]);
      return Promise.resolve([]);
    });
  });

  it('cria sem valor final: o servidor calcula, e o corpo não leva totalPrice nem serviceValue (antes: travava)', async () => {
    const onSuccess = vi.fn();
    render(<AdminBookingForm defaultClientType="manual" onSuccess={onSuccess} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Criar reserva' });
    expect(screen.queryByLabelText('Valor do Serviço (R$)')).not.toBeInTheDocument();
    preencher(NOVA);

    fireEvent.click(screen.getByRole('button', { name: 'Criar reserva' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(corpo('POST')).not.toHaveProperty('totalPrice');
    expect(corpo('POST')).not.toHaveProperty('serviceValue');
  });

  it('cria com valor final: vai como totalPrice', async () => {
    const onSuccess = vi.fn();
    render(<AdminBookingForm defaultClientType="manual" onSuccess={onSuccess} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Criar reserva' });
    preencher([...NOVA, ['Valor final (R$)', '2500']]);

    fireEvent.click(screen.getByRole('button', { name: 'Criar reserva' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(corpo('POST')).toMatchObject({ totalPrice: 2500 });
    expect(corpo('POST')).not.toHaveProperty('serviceValue');
  });

  it('edição: o campo abre com o total da reserva e o valor novo vai como totalPrice', async () => {
    const onSuccess = vi.fn();
    render(<AdminBookingForm initialData={reserva({ totalPrice: '1250.00' })} onSuccess={onSuccess} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Salvar alterações' });
    expect(screen.getByLabelText('Valor final (R$)')).toHaveValue(1250);

    preencher([['Valor final (R$)', '1400']]);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(corpo('PUT')).toMatchObject({ totalPrice: 1400 });
    expect(corpo('PUT')).not.toHaveProperty('serviceValue');
  });

  it('texto do campo: na criação, em branco é calculado; na edição, em branco o valor atual fica como está', async () => {
    const { unmount } = render(<AdminBookingForm defaultClientType="manual" onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Criar reserva' });
    expect(screen.getByText(/Em branco, é calculado pelos itens e pelas horas do evento\./)).toBeInTheDocument();
    unmount();

    render(<AdminBookingForm initialData={reserva({ totalPrice: '1250.00' })} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Salvar alterações' });
    expect(screen.getByText(/Em branco, o valor atual da reserva fica como está\./)).toBeInTheDocument();
    expect(screen.queryByText(/calculado pelos itens/)).not.toBeInTheDocument();
  });

  it('rascunho da versão anterior com o "Valor do Serviço": volta no "Valor final" e vai como totalPrice', async () => {
    localStorage.setItem('xp-draft-admin-booking-XP-DIGITADO', JSON.stringify({
      savedAt: Date.now(),
      values: {
        clientType: 'manual', clientId: '', clientName: 'Ana Souza', clientContact: '31988887777', clientEmail: 'ana@cliente.test',
        selectionType: 'kit', kitId: '', equipmentIds: [], eventDate: '2027-01-10T18:00', eventEndDate: '2027-01-10T23:00',
        location: 'Espaço VIP', street: 'Av. Brasil', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG',
        zipCode: '30110-000', addressNumber: '123', addressComplement: '', notes: '', status: 'CONFIRMED',
        deliveryStatus: 'PENDING', serviceValue: 700, paymentStatus: '',
      },
    }));
    const onSuccess = vi.fn();
    render(<AdminBookingForm initialData={reserva({ totalPrice: '0' })} onSuccess={onSuccess} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Salvar alterações' });

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));
    expect(screen.getByLabelText('Valor final (R$)')).toHaveValue(700);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(corpo('PUT')).toMatchObject({ totalPrice: 700 });
    expect(corpo('PUT')).not.toHaveProperty('serviceValue');
  });
});
