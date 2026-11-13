import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Booking } from '../../../types/types';

const { apiFetch, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));

import { AdminBookingForm } from '../AdminBookingForm';

// Auditoria do orçamento (12/11/2026). O1: a edição não dizia que mudar datas ou endereço muda o valor, nem mostrava o
// valor novo depois de salvar. O12: o campo do valor não dizia se incluía o frete. O15: "Observações" ia para o cliente
// e a edição nem mostrava as observações internas (a lista de Reservas abre a edição sem elas).
const KIT = { id: 'kit00000000000000000001', name: 'Kit Som', price: 100 };
const VALOR = 'Valor dos itens, sem frete (R$)';

const PRICING = {
  lines: [
    { description: 'Kit Festa (4 h incluídas + 1 hora extra de R$ 100,00)', quantity: 1, unitPrice: 1300, discount: 0, total: 1300, type: 'KIT', equipmentId: null, serviceId: null, kitId: 'kit1' },
    { description: 'Frete (2 viagens, 4 trechos; 30 km por trecho, 15 km cobrados por trecho)', quantity: 1, unitPrice: 220, discount: 0, total: 220, type: 'CUSTOM', equipmentId: null, serviceId: null, kitId: null },
  ],
  itemsSubtotal: 1520,
  couponDiscount: null,
  adjustment: 0,
  total: 1520,
};
// Como a ficha manda (GET /bookings/:id): com as observações internas, a chave e o resumo de preço.
const daFicha = (extra: Record<string, unknown> = {}) => ({
  id: 'XP-FICHA', eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T02:00:00.000Z',
  clientId: null, client: null, clientName: 'Ana Souza', clientContact: '31988887777', clientEmail: null,
  location: 'Espaço VIP', street: 'Av. Brasil', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG',
  zipCode: '30110-000', addressNumber: '123', status: 'CONFIRMED', deliveryStatus: 'PENDING', totalPrice: 1520,
  notes: 'Levar extensão', internalNotes: 'Portão lateral; cobrar o sinal', idempotencyKey: null, pricing: PRICING,
  ...extra,
}) as unknown as Booking;
// Como a lista de Reservas manda: sem observações internas, sem itens.
const daLista = () => {
  const { internalNotes: _i, pricing: _p, idempotencyKey: _k, ...linha } = daFicha({ id: 'XP-LISTA' }) as unknown as Record<string, unknown>;
  void _i; void _p; void _k;
  return linha as unknown as Booking;
};

let putResponse: unknown;
let fullBooking: unknown;
const corpo = (method: string) => {
  const call = apiFetch.mock.calls.find((c) => c[1]?.method === method);
  return call ? (JSON.parse(call[1].body as string) as Record<string, unknown>) : null;
};
const editar = async (reserva: Booking) => {
  const onSuccess = vi.fn();
  render(<AdminBookingForm initialData={reserva} onSuccess={onSuccess} onCancel={vi.fn()} />);
  await screen.findByRole('button', { name: 'Salvar alterações' });
  return onSuccess;
};
const salvar = async (onSuccess: ReturnType<typeof vi.fn>) => {
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  return corpo('PUT') ?? {};
};
const mudar = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  putResponse = { id: 'XP-FICHA' };
  fullBooking = daFicha({ id: 'XP-LISTA', internalNotes: 'Cliente pediu nota fiscal' });
  apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
    if (opts?.method === 'PUT') return Promise.resolve(putResponse);
    if (opts?.method === 'POST') return Promise.resolve({ id: 'XP-NOVA' });
    if (url === '/kits') return Promise.resolve([KIT]);
    if (url === '/bookings/XP-LISTA') return fullBooking instanceof Error ? Promise.reject(fullBooking) : Promise.resolve(fullBooking);
    return Promise.resolve([]);
  });
});

describe('AdminBookingForm — observações para o cliente e internas (O15)', () => {
  it('pela ficha: os dois campos abrem com o que a reserva tem e os dois vão no PUT, sem ler a reserva de novo', async () => {
    const onSuccess = await editar(daFicha());
    expect(screen.getByLabelText('Observações para o cliente')).toHaveValue('Levar extensão');
    expect(screen.getByLabelText('Observações internas')).toHaveValue('Portão lateral; cobrar o sinal');
    expect(screen.getByText('Saem na proposta, nos PDFs e na área do cliente.')).toBeInTheDocument();
    expect(screen.getByText('Só a equipe vê. Não saem na proposta nem para o cliente.')).toBeInTheDocument();

    mudar('Observações internas', 'Portão lateral; sinal pago');
    const body = await salvar(onSuccess);

    expect(body).toMatchObject({ notes: 'Levar extensão', internalNotes: 'Portão lateral; sinal pago' });
    expect(apiFetch.mock.calls.some(([url, init]) => url === '/bookings/XP-FICHA' && !init?.method)).toBe(false);
  });

  it('pela lista (sem as observações internas): a reserva é lida, as internas aparecem e vão no PUT', async () => {
    const onSuccess = await editar(daLista());
    expect(await screen.findByDisplayValue('Cliente pediu nota fiscal')).toBeInTheDocument();

    const body = await salvar(onSuccess);
    expect(body).toMatchObject({ internalNotes: 'Cliente pediu nota fiscal' });
  });

  it('pela lista, sem conseguir ler a reserva: as internas não vão no PUT (não apagam) e o aviso diz onde editar', async () => {
    fullBooking = new Error('Falha de rede');
    const onSuccess = await editar(daLista());
    expect(screen.queryByLabelText('Observações internas')).not.toBeInTheDocument();
    expect(screen.getByText(/As observações internas não puderam ser lidas agora e ficam como estão/)).toBeInTheDocument();

    const body = await salvar(onSuccess);
    expect(body).not.toHaveProperty('internalNotes');
  });

  it('criação: as observações internas vão no POST; em branco, não vão', async () => {
    const onSuccess = vi.fn();
    render(<AdminBookingForm defaultClientType="manual" onSuccess={onSuccess} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Criar reserva' });
    for (const [label, value] of [
      ['Nome do Cliente', 'Ana Souza'], ['Contato', '31988887777'], ['Kit', KIT.id], ['Início', '2027-01-10T18:00'],
      ['Término', '2027-01-10T23:00'], ['Local', 'Espaço VIP'], ['Rua', 'Av. Brasil'], ['Bairro', 'Centro'],
      ['Cidade', 'Belo Horizonte'], ['Estado', 'MG'], ['CEP', '30110-000'], ['Número', '123'],
      ['Observações para o cliente', 'Chegar 2 h antes'], ['Observações internas', 'Cliente indicado pelo Bruno'],
    ]) mudar(label, value);

    fireEvent.click(screen.getByRole('button', { name: 'Criar reserva' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(corpo('POST')).toMatchObject({ notes: 'Chegar 2 h antes', internalNotes: 'Cliente indicado pelo Bruno' });
  });
});

describe('AdminBookingForm — o valor na edição (O1 e O12)', () => {
  it('o texto do campo diz o total de hoje com o frete à parte; sem mudar datas nem endereço, nenhum aviso', async () => {
    await editar(daFicha());
    expect(screen.getByLabelText(VALOR)).toHaveValue(null);
    expect(screen.getByText(/Hoje: R\$\s1\.520,00 no total, com R\$\s220,00 de frete e pedágio\./)).toBeInTheDocument();
    expect(screen.queryByText('O valor da reserva será recalculado')).not.toBeInTheDocument();
  });

  it('mudar o término avisa que os itens do catálogo são recalculados; mudar a rua acrescenta o frete', async () => {
    await editar(daFicha());

    mudar('Término', '2027-01-11T05:00');
    expect(screen.getByText('O valor da reserva será recalculado')).toBeInTheDocument();
    expect(screen.getByText(/^Ao salvar, os itens do catálogo são recalculados pelo novo horário \(hora extra do kit, diárias e técnico\), como na criação\./)).toBeInTheDocument();

    mudar('Rua', 'Rua das Flores');
    expect(screen.getByText(/^Ao salvar, os itens do catálogo são recalculados pelo novo horário \(hora extra do kit, diárias e técnico\) e o frete é calculado de novo para o endereço novo, como na criação\./)).toBeInTheDocument();
  });

  it('valor dos itens digitado antes (a reserva tem ajuste): o aviso diz que ele continua', async () => {
    await editar(daFicha({ totalPrice: 1220, pricing: { ...PRICING, adjustment: -300, total: 1220 } }));
    mudar('Término', '2027-01-11T05:00');
    expect(screen.getByText(/O valor dos itens digitado antes continua; digite outro se quiser mudar\./)).toBeInTheDocument();
  });

  it('reserva do histórico ou encerrada: o aviso diz que o valor não muda', async () => {
    const { unmount } = render(<AdminBookingForm initialData={daFicha({ idempotencyKey: 'HIST-2023-08-001', status: 'COMPLETED' })} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Salvar alterações' });
    mudar('Início', '2027-01-10T15:00');
    expect(screen.getByText('Reserva do histórico: mudar datas ou endereço não muda o valor.')).toBeInTheDocument();
    unmount();

    await editar(daFicha({ status: 'CANCELLED' }));
    mudar('Cidade', 'Contagem');
    expect(screen.getByText('Reserva cancelada, concluída ou reembolsada: mudar datas ou endereço não muda o valor.')).toBeInTheDocument();
  });

  it('depois de salvar, o aviso do servidor aparece (de quanto para quanto)', async () => {
    putResponse = { id: 'XP-FICHA', recalculation: { message: 'Valor da reserva: de R$ 1.520,00 para R$ 1.720,00.' } };
    const onSuccess = await editar(daFicha());
    mudar('Término', '2027-01-11T05:00');

    await salvar(onSuccess);

    expect(addNotification).toHaveBeenCalledWith({ type: 'info', title: 'Valor da reserva', message: 'Valor da reserva: de R$ 1.520,00 para R$ 1.720,00.' });
  });

  it('término antes do início: erro no campo e nada enviado', async () => {
    await editar(daFicha());
    mudar('Início', '2027-01-10T20:00');
    mudar('Término', '2027-01-10T19:00');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('O término precisa ser depois do início.')).toBeInTheDocument();
    expect(corpo('PUT')).toBeNull();
  });
});

describe('AdminBookingForm — reserva antiga, sem itens, sem frete, com cupom e rascunho (O1, O12 e O15)', () => {
  it('reserva da regra anterior (com ajuste), aberta e salva sem mexer: as mesmas datas, o mesmo endereço e nenhum valor no PUT', async () => {
    const onSuccess = await editar(daFicha({ totalPrice: 1500, pricing: { ...PRICING, adjustment: -20, total: 1500 } }));
    expect(screen.queryByText('O valor da reserva será recalculado')).not.toBeInTheDocument();

    const body = await salvar(onSuccess);

    expect(body).not.toHaveProperty('totalPrice');
    expect(body).toMatchObject({
      eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T02:00:00.000Z', street: 'Av. Brasil', addressNumber: '123',
      neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG', zipCode: '30110-000', internalNotes: 'Portão lateral; cobrar o sinal',
    });
  });

  it('pedido sem itens (o do briefing): mudar as datas avisa que o valor não muda, como o servidor faz', async () => {
    await editar(daFicha({ totalPrice: 0, pricing: { lines: [], itemsSubtotal: 0, couponDiscount: null, adjustment: 0, total: 0 } }));
    mudar('Término', '2027-01-11T05:00');
    expect(screen.getByText('Reserva sem itens gravados: mudar datas ou endereço não muda o valor. Se precisar, digite o valor dos itens.')).toBeInTheDocument();
  });

  it('endereço novo numa reserva sem linha de frete (só serviços ou kit de retirada): nenhum aviso de recálculo', async () => {
    await editar(daFicha({ totalPrice: 1300, pricing: { ...PRICING, lines: [PRICING.lines[0]], itemsSubtotal: 1300, total: 1300 } }));
    mudar('Rua', 'Rua das Flores');
    expect(screen.queryByText('O valor da reserva será recalculado')).not.toBeInTheDocument();
  });

  it('valor dos itens digitado junto com datas novas: o aviso diz que o total fica com o valor digitado', async () => {
    await editar(daFicha());
    mudar('Término', '2027-01-11T05:00');
    mudar(VALOR, '1400');
    expect(screen.getByText(/O total fica com o valor dos itens digitado, mais o frete e o pedágio\.$/)).toBeInTheDocument();
  });

  it('reserva com cupom: o texto do campo diz que o cupom sai do valor dos itens', async () => {
    await editar(daFicha({ totalPrice: 1390, pricing: { ...PRICING, couponDiscount: { amount: 130, code: 'FESTA10' }, total: 1390 } }));
    expect(screen.getByText(/total = itens − cupom \+ frete \+ pedágio\. Hoje: R\$\s1\.390,00 no total/)).toBeInTheDocument();
  });

  it('rascunho feito sem as observações internas lidas: restaurá-lo depois, com elas lidas, não as apaga', async () => {
    fullBooking = new Error('Falha de rede');
    const primeira = render(<AdminBookingForm initialData={daLista()} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Salvar alterações' });
    mudar('Observações para o cliente', 'Levar extensão e cabo');
    await waitFor(() => expect(localStorage.getItem('xp-draft-admin-booking-XP-LISTA')).toContain('Levar extensão e cabo'));
    expect(JSON.parse(localStorage.getItem('xp-draft-admin-booking-XP-LISTA') as string).values).not.toHaveProperty('internalNotes');
    primeira.unmount();

    fullBooking = daFicha({ id: 'XP-LISTA', internalNotes: 'Cliente pediu nota fiscal' });
    const onSuccess = await editar(daLista());
    await screen.findByDisplayValue('Cliente pediu nota fiscal');
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));

    const body = await salvar(onSuccess);
    expect(body).toMatchObject({ notes: 'Levar extensão e cabo', internalNotes: 'Cliente pediu nota fiscal' });
  });
});
