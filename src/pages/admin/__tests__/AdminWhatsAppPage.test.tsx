import { useEffect } from 'react';
import type React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, configure, render, screen, cleanup, within, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const { apiFetch, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../components/admin/AdminLayout', () => {
  const Passthrough = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  return { default: Passthrough, AdminLayout: Passthrough };
});

import { AdminWhatsAppPage } from '../AdminWhatsAppPage';
import { MAX_MESSAGE_LENGTH, QR_MAX_REFRESHES, formatPhoneLabel, formatWhen } from '../../../utils/whatsappPanel';

configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20_000 });

// Pedido de Alyson de 24/11/2026: WhatsApp pelo painel (Evolution API num serviço privado do servidor). O QR liga o
// celular da empresa; só aparecem e só recebem mensagem os clientes cadastrados; o telefone nunca vai no endereço.

const QR = 'data:image/png;base64,iVBORw0KGgo=';
const OPEN = { configured: true, state: 'open' };
const CLOSED = { configured: true, state: 'close' };
const NOW = Date.now();
const ana = {
  phone: '5531988887777',
  phoneLabel: '(31) 98888-7777',
  name: 'Ana Souza',
  registered: true,
  bookingId: 'BK1',
  lastText: 'Oi, tudo certo para sábado?',
  lastFromMe: false,
  lastAt: NOW - 60_000,
  unread: 2,
};
// Ainda não pediu orçamento: aparece do mesmo jeito (o número é só de atendimento), sem o selo "Cliente".
const bia = { ...ana, phone: '5531977776666', phoneLabel: '(31) 97777-6666', name: 'Bia Lima', registered: false, bookingId: null, lastText: 'Combinado', lastFromMe: true, unread: 0 };
const threadAna = {
  client: { digits: ana.phone, name: ana.name, bookingId: 'BK1' },
  messages: [
    { id: 'm1', fromMe: false, text: 'Oi, tudo certo para sábado?', at: NOW - 120_000, status: null },
    { id: 'm2', fromMe: true, text: 'Tudo certo! Chegamos às 14h.', at: NOW - 60_000, status: 'DELIVERY_ACK' },
  ],
};

type Handler = unknown | ((init?: RequestInit) => unknown);
function mockApi(routes: Record<string, Handler>) {
  apiFetch.mockImplementation((endpoint: string, init?: RequestInit) => {
    const route = `${(init?.method || 'GET').toUpperCase()} ${endpoint}`;
    if (!(route in routes)) return Promise.reject(new Error(`rota inesperada no teste: ${route}`));
    try {
      const value = routes[route];
      const out = typeof value === 'function' ? (value as (init?: RequestInit) => unknown)(init) : value;
      return out instanceof Promise ? out : Promise.resolve(out);
    } catch (err) {
      return Promise.reject(err);
    }
  });
}
const httpError = (message: string, status: number) => Object.assign(new Error(message), { status });
const callsTo = (method: string, endpoint: string) =>
  apiFetch.mock.calls.filter(([url, init]) => url === endpoint && ((init as RequestInit | undefined)?.method || 'GET') === method);
const bodyOf = (call: unknown[]) => JSON.parse(String((call[1] as RequestInit).body));

const locations: Array<{ pathname: string; state: unknown }> = [];
const LocationSpy = () => {
  const location = useLocation();
  useEffect(() => {
    locations.push({ pathname: location.pathname, state: location.state });
  }, [location]);
  return null;
};

const renderPage = (state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/admin/whatsapp', state }]}>
      <Routes>
        <Route
          path="/admin/whatsapp"
          element={
            <>
              <AdminWhatsAppPage />
              <LocationSpy />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  apiFetch.mockReset();
  addNotification.mockReset();
  locations.length = 0;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('WhatsApp do painel — conexão', () => {
  it('sem configuração no servidor: explica o que falta, sem botão de conectar e sem pedir conversas', async () => {
    mockApi({ 'GET /admin/whatsapp/status': { configured: false, state: 'none' } });
    renderPage();

    expect(await screen.findByText('O WhatsApp ainda não foi ligado no servidor')).toBeInTheDocument();
    expect(screen.getByText('Não configurado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conectar' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Conversas' })).toBeNull();
    expect(callsTo('GET', '/admin/whatsapp/conversations')).toHaveLength(0);
  });

  it('erro ao carregar a situação: mostra a mensagem do servidor e "Tentar de novo" pede outra vez', async () => {
    let calls = 0;
    mockApi({
      'GET /admin/whatsapp/status': () => (++calls === 1 ? Promise.reject(httpError('Servidor fora do ar.', 503)) : CLOSED),
    });
    renderPage();

    expect(await screen.findByText('Servidor fora do ar.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('button', { name: 'Conectar' })).toBeInTheDocument();
    expect(screen.queryByText('Servidor fora do ar.')).toBeNull();
  });

  it('desconectado: "Conectar" mostra o QR com o passo a passo e avisa quando o celular conecta', async () => {
    let state = 'close';
    mockApi({
      'GET /admin/whatsapp/status': () => ({ configured: true, state }),
      'POST /admin/whatsapp/connect': { state: 'connecting', qr: QR, pairingCode: null },
      'GET /admin/whatsapp/conversations': [ana],
    });
    renderPage();

    expect(await screen.findByText('Desconectado')).toBeInTheDocument();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));

    const img = await screen.findByRole('img', { name: 'QR para conectar o WhatsApp' });
    expect(img).toHaveAttribute('src', QR);
    expect(screen.getByText(/Aparelhos conectados/)).toBeInTheDocument();
    expect(screen.getByText('Conectando…')).toBeInTheDocument();
    expect(callsTo('POST', '/admin/whatsapp/connect')).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Conversas' })).toBeNull();

    // O celular leu o QR: na próxima conferência (3 s) a tela troca para conectado e carrega as conversas.
    state = 'open';
    await act(() => vi.advanceTimersByTimeAsync(3_100));
    expect(await screen.findByText('Conectado')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'QR para conectar o WhatsApp' })).toBeNull();
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'WhatsApp conectado' }));
    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
  });

  it('o QR é trocado antes de vencer e, sem ser lido, a tela para e pede para clicar de novo', async () => {
    mockApi({
      'GET /admin/whatsapp/status': CLOSED,
      'POST /admin/whatsapp/connect': { state: 'connecting', qr: QR, pairingCode: 'ABCD-1234' },
    });
    renderPage();
    await screen.findByRole('button', { name: 'Conectar' });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));
    await screen.findByRole('img', { name: 'QR para conectar o WhatsApp' });
    expect(screen.getByText('ABCD-1234')).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(25_100));
    expect(callsTo('POST', '/admin/whatsapp/connect')).toHaveLength(2);

    await act(() => vi.advanceTimersByTimeAsync(25_000 * (QR_MAX_REFRESHES - 1)));
    expect(await screen.findByText(/O QR venceu sem ser lido/)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'QR para conectar o WhatsApp' })).toBeNull();
    // A primeira vez mais as trocas antes de parar; nenhuma depois.
    expect(callsTo('POST', '/admin/whatsapp/connect')).toHaveLength(QR_MAX_REFRESHES);
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(callsTo('POST', '/admin/whatsapp/connect')).toHaveLength(QR_MAX_REFRESHES);
  });

  it('erro ao pedir o QR: a mensagem do servidor aparece e o botão continua', async () => {
    mockApi({
      'GET /admin/whatsapp/status': CLOSED,
      'POST /admin/whatsapp/connect': () => Promise.reject(httpError('O serviço do WhatsApp não respondeu. Tente de novo em instantes.', 503)),
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Conectar' }));

    expect(await screen.findByText('O serviço do WhatsApp não respondeu. Tente de novo em instantes.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conectar' })).toBeInTheDocument();
  });

  it('"Desconectar" pede confirmação e chama DELETE; depois volta o botão de conectar', async () => {
    mockApi({
      'GET /admin/whatsapp/status': OPEN,
      'GET /admin/whatsapp/conversations': [ana],
      'DELETE /admin/whatsapp/connection': CLOSED,
    });
    renderPage();
    await screen.findByText('Ana Souza');

    fireEvent.click(screen.getByRole('button', { name: 'Desconectar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Desconectar o WhatsApp do painel?' });
    expect(within(dialog).getByText(/O celular continua com o WhatsApp normal/)).toBeInTheDocument();
    expect(callsTo('DELETE', '/admin/whatsapp/connection')).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Desconectar' }));

    expect(await screen.findByRole('button', { name: 'Conectar' })).toBeInTheDocument();
    expect(callsTo('DELETE', '/admin/whatsapp/connection')).toHaveLength(1);
    expect(screen.queryByText('Ana Souza')).toBeNull();
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'WhatsApp desconectado' }));
  });
});

describe('WhatsApp do painel — conversas e envio', () => {
  it('lista todas as conversas: nome, telefone, selo "Cliente" só para quem tem cadastro, "Você:" e as não lidas', async () => {
    mockApi({ 'GET /admin/whatsapp/status': OPEN, 'GET /admin/whatsapp/conversations': [ana, bia] });
    renderPage();

    const list = await screen.findByRole('list', { name: 'Conversas' });
    const items = within(list).getAllByRole('button');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('Ana Souza')).toBeInTheDocument();
    expect(within(items[0]).getByText('(31) 98888-7777')).toBeInTheDocument();
    expect(items[0]).toHaveTextContent('2 não lidas');
    expect(items[0]).not.toHaveTextContent('Você:');
    expect(items[1]).toHaveTextContent('Você: Combinado');
    expect(within(items[0]).getByText('Cliente')).toBeInTheDocument();
    expect(within(items[1]).queryByText('Cliente')).toBeNull();
  });

  it('sem conversas: explica quando elas aparecem', async () => {
    mockApi({ 'GET /admin/whatsapp/status': OPEN, 'GET /admin/whatsapp/conversations': [] });
    renderPage();
    expect(await screen.findByText(/Nenhuma conversa ainda/)).toBeInTheDocument();
  });

  it('abre a conversa pelo corpo do pedido (o telefone nunca vai no endereço) e mostra as mensagens e a reserva', async () => {
    mockApi({
      'GET /admin/whatsapp/status': OPEN,
      'GET /admin/whatsapp/conversations': [ana],
      'POST /admin/whatsapp/conversation': threadAna,
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Ana Souza/ }));

    const log = await screen.findByRole('log', { name: 'Mensagens' });
    expect(within(log).getByText('Tudo certo! Chegamos às 14h.')).toBeInTheDocument();
    expect(within(log).getByText('Oi, tudo certo para sábado?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver reserva/ })).toHaveAttribute('href', '/admin/reservas/BK1');
    expect(bodyOf(callsTo('POST', '/admin/whatsapp/conversation')[0])).toEqual({ phone: ana.phone });
    for (const [url] of apiFetch.mock.calls) expect(String(url)).not.toMatch(/\d{8,}/);
  });

  it('trocar de conversa antes da resposta: a resposta atrasada da primeira não volta a tela para ela', async () => {
    let releaseAna: (value: unknown) => void = () => undefined;
    mockApi({
      'GET /admin/whatsapp/status': OPEN,
      'GET /admin/whatsapp/conversations': [ana, bia],
      'POST /admin/whatsapp/conversation': (init?: RequestInit) =>
        JSON.parse(String(init?.body)).phone === ana.phone
          ? new Promise((resolve) => (releaseAna = resolve))
          : { client: { digits: bia.phone, name: bia.name, bookingId: null }, messages: [] },
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Ana Souza/ }));
    fireEvent.click(screen.getByRole('button', { name: /Bia Lima/ }));
    expect(await screen.findByLabelText('Mensagem para Bia Lima')).toBeInTheDocument();

    await act(async () => releaseAna(threadAna));
    expect(screen.getByLabelText('Mensagem para Bia Lima')).toBeInTheDocument();
    expect(screen.queryByLabelText('Mensagem para Ana Souza')).toBeNull();
  });

  it('manda a mensagem com o telefone e a reserva, limpa o campo e atualiza a conversa', async () => {
    mockApi({
      'GET /admin/whatsapp/status': OPEN,
      'GET /admin/whatsapp/conversations': [ana],
      'POST /admin/whatsapp/conversation': threadAna,
      'POST /admin/whatsapp/messages': { id: 'XYZ', phone: ana.phone },
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Ana Souza/ }));
    const field = await screen.findByLabelText('Mensagem para Ana Souza');
    expect(field).toHaveAttribute('maxLength', String(MAX_MESSAGE_LENGTH));
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();

    const typed = '  Bom dia, Ana! O contrato está no seu e-mail.  ';
    fireEvent.change(field, { target: { value: typed } });
    expect(screen.getByText(new RegExp(`^${typed.length}/1000`))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(callsTo('POST', '/admin/whatsapp/messages')).toHaveLength(1));
    expect(bodyOf(callsTo('POST', '/admin/whatsapp/messages')[0])).toEqual({
      phone: ana.phone,
      text: 'Bom dia, Ana! O contrato está no seu e-mail.',
      bookingId: 'BK1',
    });
    await waitFor(() => expect(field).toHaveValue(''));
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Mensagem enviada' }));
    await waitFor(() => expect(callsTo('POST', '/admin/whatsapp/conversation')).toHaveLength(2));
  });

  it('Ctrl+Enter envia; Enter sozinho não', async () => {
    mockApi({
      'GET /admin/whatsapp/status': OPEN,
      'GET /admin/whatsapp/conversations': [bia],
      'POST /admin/whatsapp/conversation': { client: { digits: bia.phone, name: bia.name, bookingId: null }, messages: [] },
      'POST /admin/whatsapp/messages': { id: 'XYZ', phone: bia.phone },
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Bia Lima/ }));
    const field = await screen.findByLabelText('Mensagem para Bia Lima');
    expect(screen.getByText(/Nenhuma mensagem com este número/)).toBeInTheDocument();
    fireEvent.change(field, { target: { value: 'Oi, Bia' } });

    fireEvent.keyDown(field, { key: 'Enter' });
    expect(callsTo('POST', '/admin/whatsapp/messages')).toHaveLength(0);
    fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true });
    await waitFor(() => expect(callsTo('POST', '/admin/whatsapp/messages')).toHaveLength(1));
    // Sem reserva: o pedido não leva bookingId.
    expect(bodyOf(callsTo('POST', '/admin/whatsapp/messages')[0])).toEqual({ phone: bia.phone, text: 'Oi, Bia' });
  });

  it('erro no envio: a mensagem do servidor aparece e o texto fica no campo; desconectado (409) confere a situação', async () => {
    let statusCalls = 0;
    mockApi({
      'GET /admin/whatsapp/status': () => (++statusCalls, OPEN),
      'GET /admin/whatsapp/conversations': [ana],
      'POST /admin/whatsapp/conversation': threadAna,
      'POST /admin/whatsapp/messages': () =>
        Promise.reject(httpError('O WhatsApp do painel não está conectado. Conecte pelo QR antes de mandar.', 409)),
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Ana Souza/ }));
    const field = await screen.findByLabelText('Mensagem para Ana Souza');
    fireEvent.change(field, { target: { value: 'Oi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() =>
      expect(addNotification).toHaveBeenCalledWith({
        type: 'error',
        title: 'A mensagem não foi enviada',
        message: 'O WhatsApp do painel não está conectado. Conecte pelo QR antes de mandar.',
      })
    );
    expect(field).toHaveValue('Oi');
    await waitFor(() => expect(statusCalls).toBe(2));
  });

  it('"Nova conversa": confere o telefone antes, e a recusa do servidor aparece na tela', async () => {
    mockApi({
      'GET /admin/whatsapp/status': OPEN,
      'GET /admin/whatsapp/conversations': [],
      'POST /admin/whatsapp/conversation': () => Promise.reject(httpError('Telefone inválido. Digite com o DDD, por exemplo (31) 98888-7777.', 400)),
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Nova conversa' }));
    const phone = screen.getByLabelText('Telefone');

    fireEvent.change(phone, { target: { value: '9888' } });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir conversa' }));
    expect(await screen.findByText(/Digite o telefone com o DDD/)).toBeInTheDocument();
    expect(callsTo('POST', '/admin/whatsapp/conversation')).toHaveLength(0);

    fireEvent.change(phone, { target: { value: '(31) 95555-4444' } });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir conversa' }));
    expect(await screen.findByText('Telefone inválido. Digite com o DDD, por exemplo (31) 98888-7777.')).toBeInTheDocument();
    expect(bodyOf(callsTo('POST', '/admin/whatsapp/conversation')[0])).toEqual({ phone: '(31) 95555-4444' });
  });

  it('vindo da ficha da reserva: o telefone chega pelo estado da navegação, a conversa abre e o estado é limpo', async () => {
    mockApi({
      'GET /admin/whatsapp/status': OPEN,
      'GET /admin/whatsapp/conversations': [],
      'POST /admin/whatsapp/conversation': threadAna,
    });
    renderPage({ phone: '(31) 98888-7777' });

    expect(await screen.findByLabelText('Mensagem para Ana Souza')).toBeInTheDocument();
    expect(bodyOf(callsTo('POST', '/admin/whatsapp/conversation')[0])).toEqual({ phone: '(31) 98888-7777' });
    await waitFor(() => expect(locations[locations.length - 1]).toEqual({ pathname: '/admin/whatsapp', state: null }));
  });

  it('a lista se atualiza sozinha a cada 20 s com a tela aberta', async () => {
    mockApi({ 'GET /admin/whatsapp/status': OPEN, 'GET /admin/whatsapp/conversations': [ana] });
    // O relógio falso antes de abrir a tela: a atualização automática começa assim que conecta.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPage();
    await screen.findByText('Ana Souza');
    const before = callsTo('GET', '/admin/whatsapp/conversations').length;

    await act(() => vi.advanceTimersByTimeAsync(20_100));
    expect(callsTo('GET', '/admin/whatsapp/conversations').length).toBe(before + 1);
  });
});

describe('formatWhen e formatPhoneLabel', () => {
  it('hoje (dia de Brasília): só a hora; outro dia: dia e mês; sem data: vazio', () => {
    const now = Date.parse('2026-11-24T15:00:00.000Z');
    expect(formatWhen(Date.parse('2026-11-24T13:05:00.000Z'), now)).toBe('10:05');
    expect(formatWhen(Date.parse('2026-11-20T13:05:00.000Z'), now)).toBe('20/11');
    // 01:30 UTC de 25/11 ainda é 24/11 em Brasília.
    expect(formatWhen(Date.parse('2026-11-25T01:30:00.000Z'), now)).toBe('22:30');
    expect(formatWhen(null, now)).toBe('');
  });

  it('o telefone como o servidor mostra, com e sem o 9', () => {
    expect(formatPhoneLabel('5531988887777')).toBe('(31) 98888-7777');
    expect(formatPhoneLabel('553188887777')).toBe('(31) 8888-7777');
    expect(formatPhoneLabel('31988887777')).toBe('(31) 98888-7777');
  });
});
