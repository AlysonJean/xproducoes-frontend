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
    expect(screen.queryByText('A reserva já tem itens')).not.toBeInTheDocument();
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

  it('reserva que já tem itens: avisa que salvar troca todos', async () => {
    renderPage({ ...PEDIDO, items: [{ description: 'Kit antigo', totalPrice: 900 }, { description: 'Frete', totalPrice: 50 }] });

    expect(await screen.findByText('A reserva já tem itens')).toBeInTheDocument();
    expect(screen.getByText(/Hoje ela tem 2 itens\. Salvar troca todos/)).toBeInTheDocument();
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
