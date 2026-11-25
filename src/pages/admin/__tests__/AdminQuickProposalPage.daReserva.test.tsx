import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const { apiFetch, useAuth, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));

import AdminQuickProposalPage from '../AdminQuickProposalPage';

// 18/11/2026: o pedido do briefing chega sem itens do catálogo, e o painel não tinha como pôr kit e equipamentos nele
// para montar o orçamento. O "Montar orçamento" da ficha abre a Proposta Rápida com ?reserva=<código>: a tela vem com a
// reserva e salvar troca os itens dela (PUT), sem criar outra reserva.
const CODIGO = 'XP-LUCAS-20261116-1430-8K2';
const PEDIDO = {
  id: CODIGO, status: 'PENDING', eventTitle: 'Evento corporativo', location: 'Salão do hotel',
  eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T02:00:00.000Z',
  street: 'Rua das Flores', addressNumber: '45', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG', zipCode: '30810310',
  clientId: null, client: null, clientName: 'Lucas Prado', clientContact: '31977776666', clientEmail: 'lucas@cliente.test',
  specialRequests: 'Som para 150 pessoas, dois microfones sem fio.', items: [], contractSummary: null,
};
const KIT = { id: 'kit-festa', name: 'Kit Festa', price: '1200.00', minimumRentalDuration: 5, extraHourPrice: null, fulfillment: 'CLIENT_PICKUP' };

const local = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ReservaDestino = () => {
  const { state } = useLocation();
  return <p>Página da reserva {(state as { sendProposal?: boolean } | null)?.sendProposal ? '(enviar proposta)' : ''}</p>;
};

const renderPage = (reserva: object | Error = PEDIDO, url = `/admin/orcamentos/novo?reserva=${encodeURIComponent(CODIGO)}`) => {
  apiFetch.mockImplementation((path: string, opts?: { method?: string }) => {
    if (path === `/bookings/${encodeURIComponent(CODIGO)}` && !opts?.method) return reserva instanceof Error ? Promise.reject(reserva) : Promise.resolve(reserva);
    if (path === `/bookings/${encodeURIComponent(CODIGO)}` && opts?.method === 'PUT') return Promise.resolve({ id: CODIGO });
    if (path === '/bookings' && opts?.method === 'POST') return Promise.resolve({ id: 'XP-NOVA' });
    if (path === '/kits') return Promise.resolve([KIT]);
    return Promise.resolve([]);
  });
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/admin/orcamentos/novo" element={<AdminQuickProposalPage />} />
        <Route path="/admin/reservas/:id" element={<ReservaDestino />} />
      </Routes>
    </MemoryRouter>,
  );
};

const adicionarKit = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Kits' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Adicionar Kit Festa' }));
};
const chamadas = (method: string) => apiFetch.mock.calls.filter((c) => c[1]?.method === method);

describe('Proposta Rápida — orçamento de uma reserva (pedido do briefing)', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });

  it('abre com a reserva: título, local, datas e endereço preenchidos, o briefing à vista e o cliente só para leitura', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: `Orçamento da reserva ${CODIGO}` })).toBeInTheDocument();
    expect(screen.getByLabelText('Título do Evento')).toHaveValue('Evento corporativo');
    expect(screen.getByLabelText('Local / Salão *')).toHaveValue('Salão do hotel');
    expect(screen.getByLabelText('Início Previsto *')).toHaveValue(local(PEDIDO.eventDate));
    expect(screen.getByLabelText('Término Previsto *')).toHaveValue(local(PEDIDO.eventEndDate));
    expect(screen.getByLabelText('Rua *')).toHaveValue('Rua das Flores');
    expect(screen.getByLabelText('CEP *')).toHaveValue('30810310');
    expect(screen.getByText('Briefing do cliente')).toBeInTheDocument();
    expect(screen.getByText('Som para 150 pessoas, dois microfones sem fio.')).toBeInTheDocument();
    expect(screen.getByText('Lucas Prado')).toBeInTheDocument();
    expect(screen.getByText('31977776666 · lucas@cliente.test')).toBeInTheDocument();
    expect(screen.queryByLabelText('Origem do Cliente')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nome Completo *')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Observações Internas/)).not.toBeInTheDocument();
    expect(screen.queryByText('Os itens de hoje já estão na lista')).not.toBeInTheDocument();
  });

  it('salvar grava as linhas NA reserva (PUT, sem criar outra) e volta para a ficha pedindo o envio da proposta', async () => {
    renderPage();
    await adicionarKit();
    fireEvent.change(screen.getByLabelText('Local / Salão *'), { target: { value: 'Salão Azul do hotel' } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar na reserva' }));

    expect(await screen.findByText('Página da reserva (enviar proposta)')).toBeInTheDocument();
    expect(chamadas('POST').filter((c) => c[0] === '/bookings')).toHaveLength(0);
    const puts = chamadas('PUT');
    expect(puts).toHaveLength(1);
    expect(puts[0][0]).toBe(`/bookings/${encodeURIComponent(CODIGO)}`);
    const corpo = JSON.parse(puts[0][1].body as string);
    expect(corpo).toEqual({
      eventTitle: 'Evento corporativo', location: 'Salão Azul do hotel',
      street: 'Rua das Flores', addressNumber: '45', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG', zipCode: '30810310',
      eventDate: new Date(local(PEDIDO.eventDate)).toISOString(), eventEndDate: new Date(local(PEDIDO.eventEndDate)).toISOString(),
      items: [expect.objectContaining({ itemType: 'KIT', kitId: 'kit-festa', quantity: 1, unitPrice: 1200, totalPrice: 1200 })],
    });
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Orçamento salvo na reserva' }));
  });

  it('sem item do catálogo: Salvar avisa e não grava nada', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar na reserva' }));

    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'Adicione pelo menos um item ao orçamento.' }));
    expect(chamadas('PUT')).toHaveLength(0);
  });

  // Teste do painel de 25/11/2026 (A-06): "Refazer orçamento" abria vazio, e mudar 1 quantidade pedia refazer os 8 itens
  // (o desconto do "Fechar no valor" se perdia). A tela abre com os itens gravados, com preço e desconto de hoje.
  const COM_ITENS = {
    ...PEDIDO,
    items: [
      { description: 'Kit Festa (até 5 h de evento)', itemType: 'KIT', kitId: 'kit-festa', quantity: 1, unitPrice: '1200.00', discount: '100.00', totalPrice: '1100.00' },
      { description: 'Frete (até 15 km)', itemType: 'CUSTOM', quantity: 1, unitPrice: '50.00', discount: '0.00', totalPrice: '50.00' },
    ],
  };

  it('reserva que já tem itens: a lista abre com eles, o aviso diz isso, e salvar sem mudar grava os mesmos itens', async () => {
    renderPage(COM_ITENS);

    expect(await screen.findByText('Os itens de hoje já estão na lista')).toBeInTheDocument();
    expect(screen.getByText(/Os 2 itens gravados já estão abaixo, com os preços e descontos de hoje/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByLabelText('Descrição do item').map((el) => (el as HTMLInputElement).value)).toEqual(['Kit Festa', 'Frete (até 15 km)']));
    // O desconto gravado continua (a conta à vista: tabela, desconto e total).
    expect(screen.getByTestId('qp-discount').textContent).toMatch(/100,00/);
    expect(screen.getByTestId('qp-total').textContent).toMatch(/1\.150,00/);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar na reserva' }));
    await waitFor(() => expect(chamadas('PUT')).toHaveLength(1));
    const corpo = JSON.parse(chamadas('PUT')[0][1].body as string);
    expect(corpo.items).toEqual([
      expect.objectContaining({ itemType: 'KIT', kitId: 'kit-festa', quantity: 1, unitPrice: 1200, discount: 100, totalPrice: 1100 }),
      expect.objectContaining({ itemType: 'CUSTOM', description: 'Frete (até 15 km)', quantity: 1, unitPrice: 50, totalPrice: 50 }),
    ]);
  });

  it('mudar só a quantidade de um item mantém os outros e o desconto', async () => {
    renderPage({
      ...COM_ITENS,
      items: [
        ...COM_ITENS.items,
        { description: 'Microfone sem fio', itemType: 'CUSTOM', quantity: 1, unitPrice: '80.00', discount: '0.00', totalPrice: '80.00' },
      ],
    });
    await waitFor(() => expect(screen.getAllByLabelText('Descrição do item')).toHaveLength(3));
    const quantidades = screen.getAllByLabelText(/^Qtd/);
    fireEvent.change(quantidades[2], { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar na reserva' }));
    await waitFor(() => expect(chamadas('PUT')).toHaveLength(1));
    const corpo = JSON.parse(chamadas('PUT')[0][1].body as string);
    expect(corpo.items).toHaveLength(3);
    expect(corpo.items[0]).toEqual(expect.objectContaining({ kitId: 'kit-festa', discount: 100, totalPrice: 1100 }));
    expect(corpo.items[2]).toEqual(expect.objectContaining({ description: 'Microfone sem fio', quantity: 2, totalPrice: 160 }));
  });

  it('preço gravado diferente do catálogo (negociado): fica o gravado; item que saiu do catálogo entra como está', async () => {
    renderPage({
      ...PEDIDO,
      items: [
        { description: 'Kit Festa (até 5 h de evento)', itemType: 'KIT', kitId: 'kit-festa', quantity: 1, unitPrice: '1000.00', discount: '0', totalPrice: '1000.00' },
        { description: 'Caixa antiga', itemType: 'EQUIPMENT', equipmentId: 'eq-apagado', quantity: 2, unitPrice: '40.00', discount: '0', totalPrice: '80.00' },
      ],
    });
    await waitFor(() => expect(screen.getAllByLabelText('Descrição do item')).toHaveLength(2));

    fireEvent.click(screen.getByRole('button', { name: 'Salvar na reserva' }));
    await waitFor(() => expect(chamadas('PUT')).toHaveLength(1));
    const corpo = JSON.parse(chamadas('PUT')[0][1].body as string);
    expect(corpo.items).toEqual([
      expect.objectContaining({ itemType: 'KIT', kitId: 'kit-festa', unitPrice: 1000, totalPrice: 1000 }),
      expect.objectContaining({ itemType: 'CUSTOM', description: 'Caixa antiga', quantity: 2, unitPrice: 40, totalPrice: 80 }),
    ]);
  });

  it('abrir com os itens e sair sem mudar nada não pergunta "Sair sem salvar?"', async () => {
    renderPage(COM_ITENS);
    await waitFor(() => expect(screen.getAllByLabelText('Descrição do item')).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Sair sem salvar?')).not.toBeInTheDocument();
  });

  it.each([
    ['confirmada', { status: 'CONFIRMED' }, /proposta em aberto/],
    ['com contrato aceito', { contractSummary: { state: 'ACCEPTED', acceptedAt: '2026-11-17T04:00:00Z', withdrawUntil: null } }, /já aceitou o contrato/],
  ])('reserva %s: o aviso e o Salvar desligado', async (_nome, extra, motivo) => {
    renderPage({ ...PEDIDO, ...extra });

    expect(await screen.findByText('Os itens desta reserva não mudam')).toBeInTheDocument();
    expect(screen.getByText(motivo)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar na reserva' })).toBeDisabled();
  });

  it('a reserva não abre: o erro com "Tentar de novo", o Salvar desligado; tentar de novo abre e preenche', async () => {
    renderPage(new Error('Reserva não encontrada'));

    expect(await screen.findByText('Não foi possível abrir a reserva')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar na reserva' })).toBeDisabled();

    apiFetch.mockImplementation((path: string) => Promise.resolve(path === `/bookings/${encodeURIComponent(CODIGO)}` ? PEDIDO : []));
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    await waitFor(() => expect(screen.getByLabelText('Local / Salão *')).toHaveValue('Salão do hotel'));
    expect(screen.queryByText('Não foi possível abrir a reserva')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar na reserva' })).toBeEnabled();
  });

  it('sem ?reserva, a Proposta Rápida segue criando uma reserva nova (POST)', async () => {
    renderPage(PEDIDO, '/admin/orcamentos/novo');

    expect(await screen.findByRole('heading', { name: 'Nova proposta comercial' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome Completo *')).toHaveValue('');
    expect(apiFetch.mock.calls.some((c) => String(c[0]).startsWith('/bookings/'))).toBe(false);
  });
});
