import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Onda 2 da auditoria de 19/11: F4-07 (a busca de equipamentos perdia os marcados), F4-08 (o kit escolhido sumia do
// filtro e a tela mostrava outro) e F4-09 (o select de cliente só via os 50 cadastros mais novos).
const { apiFetch, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));

import { AdminBookingForm } from '../AdminBookingForm';

const KIT_SOM = { id: 'kit00000000000000000001', name: 'Kit Som', price: 100 };
const KIT_LUZ = { id: 'kit00000000000000000002', name: 'Kit Luz', price: 200 };
const MESA = { id: 'eqp00000000000000000001', name: 'Mesa de Som', pricePerHour: 50 };
const CAIXA = { id: 'eqp00000000000000000002', name: 'Caixa JBL', pricePerHour: 40 };
const EVENTO: Array<[string, string]> = [
  ['Início', '2027-01-10T18:00'], ['Término', '2027-01-10T23:00'], ['Local', 'Espaço VIP'], ['Rua', 'Av. Brasil'],
  ['Bairro', 'Centro'], ['Cidade', 'Belo Horizonte'], ['Estado', 'MG'], ['CEP', '30110-000'], ['Número', '123'],
  ['Valor dos itens, sem frete (R$)', '500'],
];
const preencher = (campos: Array<[string, string]>) => {
  for (const [label, value] of campos) fireEvent.change(screen.getByLabelText(label), { target: { value } });
};
const post = () => {
  const call = apiFetch.mock.calls.find((c) => c[1]?.method === 'POST');
  return call ? (JSON.parse(call[1].body as string) as Record<string, unknown>) : null;
};
const clientes = (n: number, start = 0) =>
  Array.from({ length: n }, (_, i) => ({ id: `cli${String(start + i).padStart(21, '0')}`, name: `Cliente ${String(start + i).padStart(3, '0')}` }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
    if (opts?.method === 'POST' || opts?.method === 'PUT') return Promise.resolve({ id: 'XP-NOVA' });
    if (url === '/kits') return Promise.resolve([KIT_SOM, KIT_LUZ]);
    if (url === '/equipments') return Promise.resolve([MESA, CAIXA]);
    return Promise.resolve([]);
  });
});

const novaManual = async () => {
  const onSuccess = vi.fn();
  render(<AdminBookingForm defaultClientType="manual" onSuccess={onSuccess} onCancel={vi.fn()} />);
  await screen.findByRole('button', { name: 'Criar reserva' });
  preencher([['Nome do Cliente', 'Ana Souza'], ['Contato', '31988887777']]);
  return onSuccess;
};

describe('AdminBookingForm — onda 2', () => {
  it('F4-07: marcar, buscar outro e marcar de novo mantém os dois; a tela conta os marcados', async () => {
    const onSuccess = await novaManual();
    preencher([['Modo de seleção', 'equipments']]);
    fireEvent.click(await screen.findByLabelText('Mesa de Som'));

    fireEvent.change(screen.getByLabelText('Buscar equipamento'), { target: { value: 'caixa' } });
    expect(screen.getByLabelText('Mesa de Som').closest('div.hidden')).not.toBeNull(); // escondida, não desmontada
    fireEvent.click(screen.getByLabelText('Caixa JBL'));
    expect(screen.getByText('2 equipamentos selecionados')).toBeInTheDocument();

    preencher(EVENTO);
    fireEvent.click(screen.getByRole('button', { name: 'Criar reserva' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(post()?.equipmentIds).toEqual([MESA.id, CAIXA.id]);
  });

  it('F4-08: o kit escolhido continua entre as opções quando o filtro não o pega, e é ele que vai', async () => {
    const onSuccess = await novaManual();
    preencher([['Kit', KIT_SOM.id]]);
    fireEvent.change(screen.getByLabelText('Buscar Kit'), { target: { value: 'luz' } });

    const select = screen.getByLabelText('Kit') as HTMLSelectElement;
    expect(select.value).toBe(KIT_SOM.id);
    expect([...select.options].map((o) => o.textContent)).toEqual(expect.arrayContaining(['Kit Som', 'Kit Luz']));

    preencher(EVENTO);
    fireEvent.click(screen.getByRole('button', { name: 'Criar reserva' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(post()?.kitId).toBe(KIT_SOM.id);
  });

  it('F4-09: o select de cliente traz todos os cadastros (páginas de 100), não só os 50 mais novos', async () => {
    apiFetch.mockImplementation((url: string) => {
      if (url === '/admin/clients?page=1&pageSize=100') return Promise.resolve({ data: clientes(100), meta: { total: 130 } });
      if (url === '/admin/clients?page=2&pageSize=100') return Promise.resolve({ data: clientes(30, 100), meta: { total: 130 } });
      return Promise.resolve([]);
    });
    render(<AdminBookingForm onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Criar reserva' });

    const select = await screen.findByLabelText('Cliente') as HTMLSelectElement;
    await waitFor(() => expect(select.options.length).toBe(131)); // 130 + o placeholder
    expect([...select.options].some((o) => o.textContent === 'Cliente 129')).toBe(true);
  });
});
