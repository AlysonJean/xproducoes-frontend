import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { post, apiFetch, useCart, useAuth, addNotification, refreshCart } = vi.hoisted(() => ({
  post: vi.fn(),
  apiFetch: vi.fn(),
  useCart: vi.fn(),
  useAuth: vi.fn(),
  addNotification: vi.fn(),
  refreshCart: vi.fn(),
}));
vi.mock('../../../services/api', () => ({ api: { post }, apiFetch }));
vi.mock('@/services/api', () => ({ api: { post }, apiFetch }));
vi.mock('../../../hooks/useCart', () => ({ useCart }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../components/ui/BrandLoader', () => ({ BrandLoader: () => null }));
vi.mock('../../../components/ui/TrustStrip', () => ({ TrustStrip: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { QuoteRequestPage } from '../QuoteRequestPage';
import { todayISO } from '../../../utils/quoteSubmission';

const TECNICO = { id: 'sv-tec', name: 'Técnico de Som e Operação Profissional', description: 'Som', price: '300.00', duration: 180, coversWholeEvent: true, status: 'ACTIVE' };
const KIT = { id: 'kit-1', name: 'Kit Festa', price: 1200, minimumRentalDuration: 4, extraHourPrice: 50, fulfillment: 'DELIVERY_SETUP', status: 'ACTIVE', items: [] };
const USUARIO = { id: 'u-ana', name: 'Ana Souza', phone: '31988887777', email: 'ana@cliente.test' };

const abrir = async (carrinho: Record<string, unknown> = { kit: KIT }, usuario: object | null = USUARIO) => {
  useAuth.mockReturnValue({ user: usuario, setAuthenticatedUser: vi.fn(), isLoading: false });
  useCart.mockReturnValue({ cart: { kit: null, equipments: [], services: [], ...carrinho }, isLoading: false, clearCart: vi.fn().mockResolvedValue(undefined), refreshCart });
  render(
    <MemoryRouter initialEntries={['/orcamento']}>
      <Routes>
        <Route path="/orcamento" element={<QuoteRequestPage />} />
        <Route path="/orcamento-sucesso/:id" element={<p>Pedido enviado</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/services'));
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
};

const campo = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

const preencher = (extra: Record<string, string> = {}) => {
  const campos: Record<string, string> = {
    'Nome/Local do Evento *': 'Espaço VIP', 'Data do Evento *': '2030-01-10', 'Início do evento *': '19:00', 'Término do evento *': '23:00',
    'CEP *': '30110-000', 'Rua *': 'Av. Brasil', 'Número *': '123', 'Bairro *': 'Centro', 'Cidade *': 'Belo Horizonte', 'Estado *': 'MG',
    ...extra,
  };
  for (const [label, value] of Object.entries(campos)) campo(label, value);
};

const responder = (escadas = 'Não', coberto = 'Sim', estacionamento = 'Sim') => {
  fireEvent.click(within(screen.getByRole('group', { name: 'Local com escadas? *' })).getByLabelText(escadas));
  fireEvent.click(within(screen.getByRole('group', { name: 'Local coberto? *' })).getByLabelText(coberto));
  fireEvent.click(within(screen.getByRole('group', { name: 'Tem estacionamento? *' })).getByLabelText(estacionamento));
};

const confirmar = () => fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pedido de Orçamento' }));

const corpoEnviado = async (rota = '/bookings') => {
  await waitFor(() => expect(post.mock.calls.some((c) => c[0] === rota)).toBe(true));
  return post.mock.calls.find((c) => c[0] === rota)![1] as Record<string, unknown>;
};

const local = (ano: number, mes: number, dia: number, h: number, m = 0) => new Date(ano, mes - 1, dia, h, m, 0, 0).toISOString();

// Auditoria do orçamento (12/11/2026). O6: "Hora de Início da Montagem" virava o início do evento e o "Tempo de Operação" a
// duração: montagem às 15h e festa das 19h às 23h gravava o evento das 15h às 19h, ou cobrava 4 h a mais de kit e 8 h de
// técnico. O25: escada, coberto e estacionamento vinham marcados "Não". O26: WhatsApp opcional, nome sem validação no
// site e data passada aceita. O "Total estimado" não dizia que o frete fica de fora.
describe('QuoteRequestPage — início e término do evento, montagem à parte, logística e contato', { timeout: 30000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshCart.mockResolvedValue(undefined);
    apiFetch.mockImplementation((url: string) => {
      if (url === '/equipments/pricing-rules') return Promise.resolve({ equipmentPriceUnit: 'hour', kitPrice: 'PER_EVENT' });
      if (url === '/services') return Promise.resolve([TECNICO]);
      return Promise.resolve(null);
    });
    post.mockImplementation((url: string) => Promise.resolve(url.startsWith('/bookings') ? { data: { id: 'XP-NOVA' } } : { data: { valid: false, reason: 'Cupom inválido.' } }));
  });

  it('O6: os campos são início e término do evento e a montagem (opcional); não há mais "Tempo de Operação"', async () => {
    await abrir();
    expect(screen.getByLabelText('Início do evento *')).toHaveAttribute('type', 'time');
    expect(screen.getByLabelText('Término do evento *')).toHaveAttribute('type', 'time');
    expect(screen.getByLabelText('Hora da montagem (opcional)')).toHaveAttribute('type', 'time');
    expect(screen.queryByLabelText(/Tempo de Operação/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Hora de Início da Montagem/)).not.toBeInTheDocument();
  });

  it('O6: montagem 15h e festa 19h–23h grava o evento das 19h às 23h (4 h), a montagem às 15h, e cobra kit e técnico pelas 4 h do evento', async () => {
    await abrir();
    preencher({ 'Hora da montagem (opcional)': '15:00' });
    responder();
    fireEvent.click(screen.getByLabelText('Quero um técnico durante todo o evento'));

    expect(screen.getByText('Duração do evento: 4 h.')).toBeInTheDocument();
    // Kit com 4 h incluídas: sem hora extra. Técnico (R$ 300 por 3 h) em 4 h: R$ 400.
    const linha = screen.getByText('Subtotal estimado').parentElement as HTMLElement;
    expect(linha.textContent).toMatch(/1\.600,00/);
    confirmar();
    const corpo = await corpoEnviado();
    expect(corpo).toMatchObject({
      eventDate: local(2030, 1, 10, 19),
      eventEndDate: local(2030, 1, 10, 23),
      eventDuration: 4,
      setupTime: local(2030, 1, 10, 15),
      serviceIds: ['sv-tec'],
    });
  });

  it('O6: sem a montagem, nada de setupTime (antes ia o início do evento como montagem)', async () => {
    await abrir();
    preencher();
    responder();
    confirmar();
    expect(await corpoEnviado()).not.toHaveProperty('setupTime');
  });

  it('O6: a festa que vira a meia-noite (22h às 2h) termina no dia seguinte e tem 4 h', async () => {
    await abrir();
    preencher({ 'Início do evento *': '22:00', 'Término do evento *': '02:00' });
    responder();
    expect(screen.getByText('Duração do evento: 4 h (termina no dia seguinte).')).toBeInTheDocument();
    confirmar();
    expect(await corpoEnviado()).toMatchObject({ eventDate: local(2030, 1, 10, 22), eventEndDate: local(2030, 1, 11, 2), eventDuration: 4 });
  });

  it('O6: evento de mais de um dia: com a data do término, o término é nesse dia (10h do dia 10 às 10h do dia 12 = 48 h)', async () => {
    await abrir();
    preencher({ 'Início do evento *': '10:00', 'Término do evento *': '10:00', 'Data do término (opcional)': '2030-01-12' });
    responder();
    expect(screen.getByText('Duração do evento: 48 h (termina em 12/01).')).toBeInTheDocument();
    confirmar();
    expect(await corpoEnviado()).toMatchObject({ eventDate: local(2030, 1, 10, 10), eventEndDate: local(2030, 1, 12, 10), eventDuration: 48 });
  });

  it('O6: a data do término antes da data do evento é recusada, com a mensagem no campo', async () => {
    await abrir();
    preencher({ 'Data do término (opcional)': '2030-01-09' });
    responder();
    confirmar();
    expect(await screen.findByText('A data do término não pode ser antes da data do evento.')).toBeInTheDocument();
    expect(post.mock.calls.some((c) => String(c[0]).startsWith('/bookings'))).toBe(false);
  });

  it('O6: término igual ao início e montagem depois do início são recusados, com a mensagem no campo', async () => {
    await abrir();
    preencher({ 'Término do evento *': '19:00' });
    responder();
    confirmar();
    expect(await screen.findByText('O término precisa ser depois do início.')).toBeInTheDocument();

    preencher({ 'Hora da montagem (opcional)': '20:00' });
    confirmar();
    expect(await screen.findByText('A montagem precisa começar antes do início do evento.')).toBeInTheDocument();
    expect(post.mock.calls.some((c) => c[0] === '/bookings')).toBe(false);
  });

  it('O25: escada, coberto e estacionamento começam sem resposta, com "Não sei", e são obrigatórios', async () => {
    await abrir();
    for (const grupo of ['Local com escadas? *', 'Local coberto? *', 'Tem estacionamento? *']) {
      const opcoes = within(screen.getByRole('group', { name: grupo })).getAllByRole('radio') as HTMLInputElement[];
      expect(opcoes.map((o) => o.parentElement?.textContent?.trim())).toEqual(['Sim', 'Não', 'Não sei']);
      expect(opcoes.some((o) => o.checked)).toBe(false);
    }
    preencher();
    confirmar();
    expect(await screen.findAllByText('Escolha Sim, Não ou Não sei.')).toHaveLength(3);
    expect(post.mock.calls.some((c) => c[0] === '/bookings')).toBe(false);
  });

  it('O25: "Não sei" grava o caso comum e vai escrito no texto do pedido, junto com a hora da montagem', async () => {
    await abrir();
    preencher({ 'Hora da montagem (opcional)': '16:30' });
    responder('Não sei', 'Não sei', 'Não');
    confirmar();
    const corpo = await corpoEnviado();
    expect(corpo).toMatchObject({ requiresStairs: false, isCovered: true, hasParking: false });
    expect(corpo.specialRequests).toBe([
      '— Pedido de orçamento pelo site —',
      'Liberado para montar a partir de: 16:30',
      'Escadas no acesso: Não sei',
      'Local coberto: Não sei',
      'Estacionamento ou carga e descarga: Não',
    ].join('\n'));
  });

  it('O26: WhatsApp é obrigatório e com DDD; quem tem conta já vem com o número do cadastro', async () => {
    await abrir();
    expect(screen.getByLabelText('WhatsApp com DDD *')).toHaveValue('31988887777');
    preencher({ 'WhatsApp com DDD *': '98888-777' });
    responder();
    confirmar();
    expect(await screen.findByText('Informe o WhatsApp com DDD.')).toBeInTheDocument();
    expect(post.mock.calls.some((c) => c[0] === '/bookings')).toBe(false);

    campo('WhatsApp com DDD *', '(31) 97777-6666');
    confirmar();
    expect((await corpoEnviado()).clientContact).toBe('(31) 97777-6666');
  });

  it('O26: convidado sem nome recebe a mensagem do site, não o erro genérico do servidor', async () => {
    await abrir({ kit: KIT }, null);
    preencher({ 'Seu E-mail *': 'ana@cliente.test', 'WhatsApp com DDD *': '31988887777' });
    responder();
    confirmar();
    expect(await screen.findByText('Informe seu nome.')).toBeInTheDocument();
    expect(post.mock.calls.some((c) => c[0] === '/bookings/guest')).toBe(false);

    campo('Seu Nome *', 'Ana Souza');
    confirmar();
    expect(await corpoEnviado('/bookings/guest')).toMatchObject({ clientName: 'Ana Souza', clientEmail: 'ana@cliente.test', clientContact: '31988887777' });
  });

  it('O26: data passada (ou horário de hoje que já passou) é recusada no site', async () => {
    await abrir();
    preencher({ 'Data do Evento *': '2020-01-10' });
    responder();
    confirmar();
    expect(await screen.findByText('Essa data já passou. Escolha a data do evento.')).toBeInTheDocument();

    preencher({ 'Data do Evento *': todayISO(), 'Início do evento *': '00:00', 'Término do evento *': '23:59' });
    confirmar();
    expect(await screen.findByText('Esse horário de hoje já passou.')).toBeInTheDocument();
    expect(post.mock.calls.some((c) => c[0] === '/bookings')).toBe(false);
  });

  it('o total diz "(sem frete)" e explica que frete e pedágio entram na proposta', async () => {
    await abrir();
    expect(screen.getByText('Total estimado (sem frete)')).toBeInTheDocument();
    expect(screen.getByText(/O frete, calculado pela distância até o local, e o pedágio, quando houver, entram na proposta/)).toBeInTheDocument();
  });

  it('O19: ao abrir, pede a releitura do carrinho', async () => {
    await abrir();
    expect(refreshCart).toHaveBeenCalled();
  });

  it('O19/O23: item indisponível aparece com o nome e o pedido não sai; o estimado não o soma', async () => {
    await abrir({
      kit: { ...KIT, status: 'COMING_SOON' },
      equipments: [{ id: 'eq-velho', name: 'Mesa Antiga', pricePerHour: 30, catalogMissing: true }, { id: 'eq-1', name: 'Caixa Ativa', pricePerHour: 10, status: 'ACTIVE' }],
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Estes itens não estão disponíveis agora: Kit Festa, Mesa Antiga.');
    preencher();
    responder();
    const linha = screen.getByText('Subtotal estimado').parentElement as HTMLElement;
    expect(linha.textContent).toMatch(/40,00/);
    confirmar();
    expect(await screen.findByText('Não dá para enviar com item indisponível: Kit Festa, Mesa Antiga. Tire do carrinho e envie de novo.')).toBeInTheDocument();
    expect(post.mock.calls.some((c) => c[0] === '/bookings')).toBe(false);
  });

  it('O23: o servidor recusou por item indisponível: o carrinho é relido (com força) para o aviso dizer qual', async () => {
    post.mockImplementation((url: string) =>
      url === '/bookings'
        ? Promise.reject(new Error('O kit do pedido não está disponível agora. Tire-o do carrinho e envie o pedido de novo.'))
        : Promise.resolve({ data: { valid: false } }));
    await abrir();
    preencher();
    responder();
    confirmar();
    await waitFor(() => expect(refreshCart).toHaveBeenCalledWith({ force: true }));
  });
});
