import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Booking } from '../../../types/types';

const { apiFetch, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));

import { AdminBookingForm } from '../AdminBookingForm';

const KIT = { id: 'kit00000000000000000001', name: 'Kit Som', price: 100 };
const MESA = { id: 'eqp00000000000000000001', name: 'Mesa de Som', pricePerHour: 50 };
const CAIXA = { id: 'eqp00000000000000000002', name: 'Caixa JBL', pricePerHour: 40 };

const enviado = (method: string) => {
  const call = apiFetch.mock.calls.find((c) => c[1]?.method === method);
  return call ? { url: call[0] as string, body: JSON.parse(call[1].body as string) as Record<string, unknown> } : null;
};

const preencher = (campos: Array<[string, string]>) => {
  for (const [label, value] of campos) fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

const EVENTO: Array<[string, string]> = [
  ['Início', '2027-01-10T18:00'],
  ['Término', '2027-01-10T23:00'],
  ['Local', 'Espaço VIP'],
  ['Rua', 'Av. Brasil'],
  ['Bairro', 'Centro'],
  ['Cidade', 'Belo Horizonte'],
  ['Estado', 'MG'],
  ['CEP', '30110-000'],
  ['Número', '123'],
  ['Valor do Serviço (R$)', '500'],
];

const novaReservaManual = async () => {
  const onSuccess = vi.fn();
  render(<AdminBookingForm defaultClientType="manual" onSuccess={onSuccess} onCancel={vi.fn()} />);
  await screen.findByRole('button', { name: 'Criar reserva' });
  return onSuccess;
};

// Achado (auditoria ponta a ponta): o schema exigia os campos dos dois modos (clientId com cliente
// manual, kitId com equipamentos avulsos, e-mail sempre). O campo do outro modo nem aparece na tela,
// então "Criar reserva" não fazia nada, sem erro visível. E o horário ia sem fuso (o servidor, em UTC,
// gravava 3 h antes); a edição mostrava o horário UTC.
describe('AdminBookingForm — reserva de cliente manual', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (opts?.method === 'POST' || opts?.method === 'PUT') return Promise.resolve({ id: 'XP-NOVA' });
      if (url === '/kits') return Promise.resolve([KIT]);
      if (url === '/equipments') return Promise.resolve([MESA, CAIXA]);
      return Promise.resolve([]);
    });
  });

  it('sem e-mail: cria a reserva com nome e contato, sem clientId/userId nem clientEmail vazio, horário em ISO', async () => {
    const onSuccess = await novaReservaManual();
    preencher([['Nome do Cliente', 'Ana Souza'], ['Contato', '31988887777'], ['Kit', KIT.id], ...EVENTO]);

    fireEvent.click(screen.getByRole('button', { name: 'Criar reserva' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const post = enviado('POST');
    expect(post?.url).toBe('/bookings');
    expect(post?.body).toMatchObject({
      clientName: 'Ana Souza',
      clientContact: '31988887777',
      kitId: KIT.id,
      eventDate: new Date('2027-01-10T18:00').toISOString(),
      eventEndDate: new Date('2027-01-10T23:00').toISOString(),
    });
    expect(post?.body).not.toHaveProperty('clientId');
    expect(post?.body).not.toHaveProperty('userId');
    expect(post?.body).not.toHaveProperty('clientEmail');
  });

  it('com equipamentos avulsos (sem kit) também cria', async () => {
    const onSuccess = await novaReservaManual();
    preencher([['Nome do Cliente', 'Ana Souza'], ['Contato', '31988887777'], ['Email', 'ana@cliente.test'], ['Modo de seleção', 'equipments']]);
    fireEvent.click(await screen.findByLabelText('Mesa de Som'));
    preencher(EVENTO);

    fireEvent.click(screen.getByRole('button', { name: 'Criar reserva' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const post = enviado('POST');
    expect(post?.body).toMatchObject({ clientEmail: 'ana@cliente.test', equipmentIds: [MESA.id] });
    expect(post?.body).not.toHaveProperty('kitId');
  });

  it('sem contato: o erro aparece no campo Contato e nada é enviado', async () => {
    await novaReservaManual();
    preencher([['Nome do Cliente', 'Ana Souza'], ['Kit', KIT.id], ...EVENTO]);

    fireEvent.click(screen.getByRole('button', { name: 'Criar reserva' }));

    expect(await screen.findByText('Informe o contato do cliente.')).toBeInTheDocument();
    expect(enviado('POST')).toBeNull();
  });

  // O select de cliente (e o de kit) tem o placeholder desabilitado: sem valor inicial, o navegador
  // abria no PRIMEIRO cliente da lista e a reserva ia para ele sem ninguém escolher.
  it('Nova Reserva (cliente cadastrado) sem escolher o cliente: pede a escolha e nada é enviado', async () => {
    apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (opts?.method === 'POST' || opts?.method === 'PUT') return Promise.resolve({ id: 'XP-NOVA' });
      if (url === '/admin/clients') return Promise.resolve([{ id: 'cli00000000000000000001', name: 'Alice Primeira', email: 'alice@cliente.test' }]);
      if (url === '/kits') return Promise.resolve([KIT]);
      return Promise.resolve([]);
    });
    render(<AdminBookingForm onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Criar reserva' });
    preencher([['Kit', KIT.id], ...EVENTO]);

    fireEvent.click(screen.getByRole('button', { name: 'Criar reserva' }));

    expect(await screen.findByText('Selecione um cliente.')).toBeInTheDocument();
    expect(enviado('POST')).toBeNull();
  });

  // A API manda o kit da reserva em `kit` (não em `kits[]`): a edição de reserva só com kit abria no
  // modo equipamentos, sem nenhum marcado, e "Salvar alterações" não enviava nada nem mostrava erro.
  it('edição de reserva só com kit (formato da API): salva com o mesmo kit', async () => {
    const reserva = {
      id: 'XP-KIT',
      eventDate: '2027-01-10T21:00:00.000Z',
      eventEndDate: '2027-01-11T02:00:00.000Z',
      client: { name: 'Bia Costa', phone: '31955554444' },
      kitId: KIT.id,
      kit: { id: KIT.id, name: KIT.name },
      location: 'Espaço VIP', street: 'Av. Brasil', neighborhood: 'Centro', city: 'Belo Horizonte',
      state: 'MG', zipCode: '30110-000', addressNumber: '123',
      status: 'CONFIRMED', deliveryStatus: 'PENDING', serviceValue: 500,
    } as unknown as Booking;
    const onSuccess = vi.fn();
    render(<AdminBookingForm initialData={reserva} onSuccess={onSuccess} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Salvar alterações' });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(enviado('PUT')?.body).toMatchObject({ kitId: KIT.id });
  });

  it('edição: o horário salvo volta para o backend como o mesmo instante', async () => {
    // Fuso fixo: em UTC (o fuso do CI) o ISO cortado e o horário local coincidem.
    vi.stubEnv('TZ', 'America/Sao_Paulo');
    const reserva = {
      id: 'XP-EXISTENTE',
      eventDate: '2027-01-10T21:00:00.000Z',
      eventEndDate: '2027-01-11T02:00:00.000Z',
      client: { name: 'Bia Costa', phone: '31955554444' },
      location: 'Espaço VIP', street: 'Av. Brasil', neighborhood: 'Centro', city: 'Belo Horizonte',
      state: 'MG', zipCode: '30110-000', addressNumber: '123',
      status: 'CONFIRMED', deliveryStatus: 'PENDING', serviceValue: 500,
      equipments: [{ id: MESA.id }],
    } as unknown as Booking;
    const onSuccess = vi.fn();
    render(<AdminBookingForm initialData={reserva} onSuccess={onSuccess} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Salvar alterações' });

    // O campo mostra o horário local (antes: o ISO cortado, 21:00 em UTC).
    expect(screen.getByLabelText('Início')).toHaveValue('2027-01-10T18:00');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const put = enviado('PUT');
    expect(put?.url).toBe('/bookings/XP-EXISTENTE');
    expect(put?.body).toMatchObject({ eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T02:00:00.000Z' });
  });
});
