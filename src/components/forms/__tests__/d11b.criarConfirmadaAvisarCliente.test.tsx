import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { apiFetch, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));

import { AdminBookingForm } from '../AdminBookingForm';
import { ManualBookingModal } from '../../modals/ManualBookingModal';

// D11 (aprovada em 02/11/2026): a reserva criada já Confirmada pelo admin passa a avisar o cliente uma vez, com
// "Avisar o cliente por e-mail" marcada por padrão nas duas telas que criam assim: o formulário de reservas
// (status Confirmada) e o modal "Adicionar Reserva Manual" da agenda (sempre Confirmada). Desmarcada, o corpo
// leva notifyClient: false; marcada, o corpo fica como antes (o servidor avisa por padrão).
const LABEL = 'Avisar o cliente por e-mail';
const KIT = { id: 'kit00000000000000000001', name: 'Kit Som', price: 100 };

const post = () => {
  const call = apiFetch.mock.calls.find((c) => c[1]?.method === 'POST');
  return call ? (JSON.parse(call[1].body as string) as Record<string, unknown>) : null;
};
const preencher = (campos: Array<[string | RegExp, string]>) => {
  for (const [label, value] of campos) fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
    if (opts?.method === 'POST') return Promise.resolve({ id: 'XP-NOVA' });
    if (url === '/kits') return Promise.resolve([KIT]);
    return Promise.resolve([]);
  });
});

describe('formulário de reservas — criar já Confirmada (D11)', () => {
  const novaReserva = async () => {
    const onSuccess = vi.fn();
    render(<AdminBookingForm defaultClientType="manual" onSuccess={onSuccess} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Criar reserva' });
    preencher([
      ['Nome do Cliente', 'Ana Souza'], ['Contato', '31988887777'], ['Email', 'ana@cliente.test'], ['Kit', KIT.id],
      ['Início', '2027-12-20T22:00'], ['Término', '2027-12-21T02:00'], ['Local', 'Espaço VIP'], ['Rua', 'Av. Brasil'],
      ['Bairro', 'Centro'], ['Cidade', 'Belo Horizonte'], ['Estado', 'MG'], ['CEP', '30110-000'], ['Número', '123'],
      // O campo de valor é de outra decisão (D8a): achado pelo começo do rótulo.
      [/^Valor .*\(R\$\)$/, '500'],
    ]);
    return onSuccess;
  };

  it('com status Pendente, a caixa não aparece', async () => {
    await novaReserva();
    expect(screen.queryByLabelText(LABEL)).not.toBeInTheDocument();
  });

  it('com status Confirmada, a caixa aparece marcada; desmarcada, o corpo leva notifyClient: false', async () => {
    const onSuccess = await novaReserva();
    preencher([['Status', 'CONFIRMED']]);

    const caixa = await screen.findByLabelText(LABEL);
    expect(caixa).toBeChecked();
    fireEvent.click(caixa);
    fireEvent.click(screen.getByRole('button', { name: 'Criar reserva' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(post()).toMatchObject({ status: 'CONFIRMED', notifyClient: false, clientEmail: 'ana@cliente.test' });
  });

  it('com status Confirmada e a caixa marcada, o corpo sai como antes (o servidor avisa o cliente)', async () => {
    const onSuccess = await novaReserva();
    preencher([['Status', 'CONFIRMED']]);
    await screen.findByLabelText(LABEL);
    fireEvent.click(screen.getByRole('button', { name: 'Criar reserva' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(post()).toMatchObject({ status: 'CONFIRMED' });
    expect(post()).not.toHaveProperty('notifyClient');
  });
});

describe('modal "Adicionar Reserva Manual" da agenda (D11)', () => {
  const abrirEPreencher = async () => {
    const onSuccess = vi.fn();
    render(<ManualBookingModal isOpen onClose={vi.fn()} onSuccess={onSuccess} />);
    fireEvent.click(await screen.findByLabelText(/^Kit Som/));
    preencher([
      ['Nome do cliente', 'Carla Dias'], ['Contato (telefone ou e-mail)', 'carla@cliente.test'],
      ['Início do evento', '2027-12-20T22:00'], ['Fim do evento', '2027-12-21T02:00'],
      ['Local do evento', 'Espaço VIP'], ['Rua', 'Av. Brasil'], ['Número', '123'], ['Bairro', 'Centro'],
      ['CEP', '30110-000'], ['Cidade', 'Belo Horizonte'], ['Estado', 'MG'],
    ]);
    return onSuccess;
  };

  it('a caixa vem marcada; desmarcada, a reserva confirmada vai com notifyClient: false', async () => {
    const onSuccess = await abrirEPreencher();

    const caixa = screen.getByLabelText(LABEL);
    expect(caixa).toBeChecked();
    fireEvent.click(caixa);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Reserva' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(post()).toMatchObject({ status: 'CONFIRMED', kitId: KIT.id, notifyClient: false });
  });

  it('marcada, o corpo sai como antes', async () => {
    const onSuccess = await abrirEPreencher();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Reserva' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(post()).toMatchObject({ status: 'CONFIRMED' });
    expect(post()).not.toHaveProperty('notifyClient');
  });

  it('a caixa volta marcada ao reabrir o modal: desmarcar e cancelar não vale para a próxima reserva', async () => {
    const props = { onClose: vi.fn(), onSuccess: vi.fn() };
    const { rerender } = render(<ManualBookingModal isOpen {...props} />);
    fireEvent.click(await screen.findByLabelText(LABEL));
    expect(screen.getByLabelText(LABEL)).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(props.onClose).toHaveBeenCalled();

    rerender(<ManualBookingModal isOpen={false} {...props} />);
    rerender(<ManualBookingModal isOpen {...props} />);

    expect(await screen.findByLabelText(LABEL)).toBeChecked();
  });
});
