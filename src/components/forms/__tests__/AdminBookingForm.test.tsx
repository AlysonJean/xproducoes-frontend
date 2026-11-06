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
  ['Valor final (R$)', '500'],
];

const novaReservaManual = async () => {
  const onSuccess = vi.fn();
  render(<AdminBookingForm defaultClientType="manual" onSuccess={onSuccess} onCancel={vi.fn()} />);
  await screen.findByRole('button', { name: 'Criar reserva' });
  return onSuccess;
};

// Reserva como a API devolve (GET /bookings/:id). Cliente digitado: sem cadastro (clientId nulo) e com
// o contato na própria reserva.
const ENDERECO = {
  location: 'Espaço VIP', street: 'Av. Brasil', neighborhood: 'Centro', city: 'Belo Horizonte',
  state: 'MG', zipCode: '30110-000', addressNumber: '123',
};
const reservaDigitada = (extra: Record<string, unknown> = {}) => ({
  id: 'XP-DIGITADO',
  eventDate: '2027-01-10T21:00:00.000Z',
  eventEndDate: '2027-01-11T02:00:00.000Z',
  clientId: null,
  client: null,
  clientName: 'Ana Souza',
  clientContact: '31988887777',
  clientEmail: 'ana@cliente.test',
  ...ENDERECO,
  status: 'CONFIRMED', deliveryStatus: 'PENDING', totalPrice: 500,
  ...extra,
}) as unknown as Booking;
// Cliente cadastrado: o nome da conta é diferente do digitado no orçamento (a tela mostra o da conta).
const CLIENTE = 'cli00000000000000000001';
const reservaCadastrada = (client: Record<string, unknown>) => ({
  ...reservaDigitada(),
  id: 'XP-CADASTRADO',
  clientId: CLIENTE,
  client,
  clientName: 'Carla (orçamento)',
  clientContact: '31966665555',
  clientEmail: 'carla@cliente.test',
}) as unknown as Booking;

const editar = async (reserva: Booking) => {
  const onSuccess = vi.fn();
  render(<AdminBookingForm initialData={reserva} onSuccess={onSuccess} onCancel={vi.fn()} />);
  await screen.findByRole('button', { name: 'Salvar alterações' });
  return onSuccess;
};

const salvar = async (onSuccess: ReturnType<typeof vi.fn>) => {
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  return enviado('PUT')?.body ?? {};
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
  // Na edição o kit agora aparece só para leitura e não vai no corpo (o servidor nunca gravou a troca).
  it('edição de reserva só com kit (formato da API): mostra o kit e salva sem mandá-lo', async () => {
    const onSuccess = await editar(reservaDigitada({ id: 'XP-KIT', kitId: KIT.id, kit: { id: KIT.id, name: KIT.name } }));
    expect(screen.getByText(KIT.name)).toBeInTheDocument();

    const corpo = await salvar(onSuccess);

    expect(corpo).not.toHaveProperty('kitId');
    expect(corpo).not.toHaveProperty('equipmentIds');
  });

  it('edição: o horário salvo volta para o backend como o mesmo instante', async () => {
    // Fuso fixo: em UTC (o fuso do CI) o ISO cortado e o horário local coincidem.
    vi.stubEnv('TZ', 'America/Sao_Paulo');
    const onSuccess = await editar(reservaDigitada({ id: 'XP-EXISTENTE', equipments: [{ id: MESA.id }] }));

    // O campo mostra o horário local (antes: o ISO cortado, 21:00 em UTC).
    expect(screen.getByLabelText('Início')).toHaveValue('2027-01-10T18:00');

    const corpo = await salvar(onSuccess);

    expect(enviado('PUT')?.url).toBe('/bookings/XP-EXISTENTE');
    expect(corpo).toMatchObject({ eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T02:00:00.000Z' });
  });
});

// Achado (auditoria ponta a ponta): a edição abria sempre no modo "Manual" (o tipo saía de `userId`,
// que a reserva não tem), com nome e contato lidos do cadastro — vazios na reserva de cliente digitado,
// que guarda o contato nela mesma. Mostrava status, kit e equipamentos editáveis, e o servidor não
// gravava nada disso nem o contato: "Reserva atualizada" sem mudar a reserva.
describe('AdminBookingForm — a edição grava o que mostra', () => {
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

  it('cliente digitado: abre com o contato da reserva e manda o que foi editado, sem status, kit nem equipamentos', async () => {
    const onSuccess = await editar(reservaDigitada({ kit: { id: KIT.id, name: KIT.name }, equipments: [{ id: MESA.id, name: MESA.name }] }));
    expect(screen.getByLabelText('Nome do Cliente')).toHaveValue('Ana Souza');
    expect(screen.getByLabelText('Contato')).toHaveValue('31988887777');
    expect(screen.getByLabelText('Email')).toHaveValue('ana@cliente.test');
    expect(screen.getByText('Nome e contato do cliente gravados nesta reserva')).toBeInTheDocument();
    // O status muda pelos botões de status; o tipo de cliente e os itens não trocam na edição.
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tipo de Cliente')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Modo de seleção')).not.toBeInTheDocument();
    expect(screen.getByText(KIT.name)).toBeInTheDocument();
    expect(screen.getByText(MESA.name)).toBeInTheDocument();

    preencher([['Contato', '31977776666'], ['Entrega', 'ARRIVED']]);
    const corpo = await salvar(onSuccess);

    expect(corpo).toMatchObject({ clientName: 'Ana Souza', clientContact: '31977776666', clientEmail: 'ana@cliente.test', deliveryStatus: 'ARRIVED' });
    for (const campo of ['status', 'kitId', 'equipmentIds', 'clientId']) expect(corpo).not.toHaveProperty(campo);
  });

  it('cliente digitado: e-mail apagado vai como null (sai da reserva)', async () => {
    const onSuccess = await editar(reservaDigitada());

    preencher([['Email', '']]);
    const corpo = await salvar(onSuccess);

    expect(corpo.clientEmail).toBeNull();
  });

  // Reserva que já não tinha e-mail: o campo segue fora do corpo. Com null em toda edição, o backend
  // anterior a este lote (que recusa null) devolvia 400 ao salvar qualquer reserva de cliente digitado
  // sem e-mail, e o site publicado antes do backend (ou o backend revertido sozinho) travava a edição.
  it('cliente digitado sem e-mail: salva sem mandar clientEmail (null só ao apagar um e-mail que existia)', async () => {
    const onSuccess = await editar(reservaDigitada({ clientEmail: null }));

    const corpo = await salvar(onSuccess);

    expect(corpo).not.toHaveProperty('clientEmail');
    expect(corpo).toMatchObject({ clientName: 'Ana Souza', clientContact: '31988887777' });
  });

  it.each([
    ['como a ficha recebe', { id: CLIENTE, phone: '31966665555', user: { id: 'usr1', name: 'Carla Dias', email: 'carla@cliente.test' } }],
    ['como a lista de Reservas monta', { name: 'Carla Dias' }],
  ])('cliente cadastrado (%s): aparece só para leitura e nada do cliente vai no corpo', async (_origem, client) => {
    const onSuccess = await editar(reservaCadastrada(client));
    expect(screen.getByText('Carla Dias')).toBeInTheDocument();
    expect(screen.getByText('O cliente cadastrado da reserva não troca na edição')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nome do Cliente')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tipo de Cliente')).not.toBeInTheDocument();

    const corpo = await salvar(onSuccess);

    for (const campo of ['clientId', 'clientName', 'clientContact', 'clientEmail']) expect(corpo).not.toHaveProperty(campo);
  });

  // Os campos do cliente não aparecem para o cadastrado: um e-mail fora do padrão gravado na reserva
  // não pode virar erro escondido que trava o "Salvar alterações".
  it('cliente cadastrado com e-mail fora do padrão na reserva: salva mesmo assim', async () => {
    const onSuccess = await editar({ ...reservaCadastrada({ name: 'Carla Dias' }), clientEmail: 'carla(at)cliente' } as unknown as Booking);

    await salvar(onSuccess);
  });

  it('reserva só com serviços (sem kit nem equipamentos): mostra os itens e salva', async () => {
    const onSuccess = await editar(reservaDigitada({ services: [{ id: 'srv1', name: 'Operador de som' }] }));
    expect(screen.getByText('Operador de som')).toBeInTheDocument();
    expect(screen.getByText(/Kit, equipamentos e serviços não mudam na edição/)).toBeInTheDocument();

    await salvar(onSuccess);
  });

  it('rascunho da versão anterior (modo Manual) numa reserva de cliente cadastrado: o cliente segue só para leitura', async () => {
    localStorage.setItem('xp-draft-admin-booking-XP-CADASTRADO', JSON.stringify({
      savedAt: Date.now(),
      values: {
        clientType: 'manual', clientId: '', clientName: 'Outro Nome', clientContact: '31900000000', clientEmail: '',
        selectionType: 'equipments', kitId: '', equipmentIds: [MESA.id],
        eventDate: '2027-01-10T18:00', eventEndDate: '2027-01-10T23:00', ...ENDERECO, addressComplement: '',
        notes: '', status: 'CONFIRMED', deliveryStatus: 'PENDING', serviceValue: 500, paymentStatus: '',
      },
    }));
    const onSuccess = await editar(reservaCadastrada({ id: CLIENTE, user: { name: 'Carla Dias' } }));

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));

    expect(screen.queryByLabelText('Nome do Cliente')).not.toBeInTheDocument();
    const corpo = await salvar(onSuccess);
    expect(corpo).not.toHaveProperty('clientName');
    expect(corpo).not.toHaveProperty('equipmentIds');
  });

  it('criação continua com tipo de cliente, escolha de kit e status (que vai no corpo)', async () => {
    const onSuccess = await novaReservaManual();
    expect(screen.getByLabelText('Tipo de Cliente')).toBeInTheDocument();
    expect(screen.getByLabelText('Modo de seleção')).toBeInTheDocument();
    preencher([['Nome do Cliente', 'Ana Souza'], ['Contato', '31988887777'], ['Kit', KIT.id], ['Status', 'CONFIRMED'], ...EVENTO]);

    fireEvent.click(screen.getByRole('button', { name: 'Criar reserva' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(enviado('POST')?.body).toMatchObject({ status: 'CONFIRMED', kitId: KIT.id });
  });
});
