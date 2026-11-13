import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { post, apiFetch, useCart, useAuth, addNotification } = vi.hoisted(() => ({
  post: vi.fn(),
  apiFetch: vi.fn(),
  useCart: vi.fn(),
  useAuth: vi.fn(),
  addNotification: vi.fn(),
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
import { resetStructureCatalogCache } from '../../../utils/cartCatalog';

// Palco (13/11/2026): os Kits 06 e 08 deixam de trazer o conjunto de palco, vendido à parte. No pedido com kit de entrega
// ou equipamento avulso, a seção recolhível "Palco e estruturas (opcional)" oferece os itens ativos da categoria
// "Estruturas" do catálogo (pela categoria, nunca pelo nome), uma caixa por item; marcado, soma no subtotal pela diária
// vezes as diárias do evento (a conta do equipamento avulso) e vai no pedido como equipamento. Não oferece o que já está
// no carrinho nem o que o kit traz.

const USUARIO = { id: 'u-ana', name: 'Ana Souza', phone: '31988887777', email: 'ana@cliente.test' };
const ESTRUTURAS = { id: 'cat-est', name: 'Estruturas' };
// O equipamento como GET /equipments devolve.
const equip = (id: string, name: string, price: string, category: { id: string; name: string }, extra: Record<string, unknown> = {}) => ({
  id, slug: id, name, pricePerHour: price, priceUnit: 'day', status: 'ACTIVE', category, categoryId: category.id, ...extra,
});
const TABLADO = equip('eq-tablado', 'Tablado de Palco Modular', '400.00', ESTRUTURAS);
const TRAVE = equip('eq-trave', 'Trave Multiuso Pro', '200.00', { id: 'cat-est', name: 'estruturas' });
const BACKDROP = equip('eq-backdrop', 'Backdrop', '200.00', ESTRUTURAS);
const LOW_GROUND = equip('eq-low', 'Trave Low-Ground', '150.00', ESTRUTURAS);
const TENDA_EM_BREVE = equip('eq-tenda', 'Tenda Gazebo', '300.00', ESTRUTURAS, { status: 'COMING_SOON' });
const LUZ_DE_PALCO = equip('eq-luz', 'Luz de Palco', '80.00', { id: 'cat-luz', name: 'Iluminação' });
const CATALOGO = [BACKDROP, LUZ_DE_PALCO, TABLADO, TENDA_EM_BREVE, LOW_GROUND, TRAVE];

// Kit 06 no carrinho da conta: os itens do kit vêm só com o serviceId (cartRepository), sem dizer o equipamento.
const KIT_CARRINHO = { id: 'kit-06', name: 'Kit 06', price: 1500, fulfillment: 'DELIVERY_SETUP', status: 'ACTIVE', items: [{ serviceId: 'sv-log' }, { serviceId: null }] };
// A página do kit (GET /kits/kit-06) diz o equipamento: a Trave Low-Ground vem no kit.
const KIT_DETALHE = {
  ...KIT_CARRINHO,
  items: [
    { id: 'i1', kitId: 'kit-06', serviceId: 'sv-log', quantity: 1 },
    { id: 'i2', kitId: 'kit-06', equipmentId: 'eq-low', quantity: 1, equipment: LOW_GROUND },
  ],
};
const KIT_RETIRADA = { id: 'kit-r', name: 'Kit Retirada', price: 300, fulfillment: 'CLIENT_PICKUP', status: 'ACTIVE', items: [] };
// Equipamento avulso do carrinho (de outra categoria).
const CAIXA = { id: 'eq-caixa', name: 'Caixa de som', pricePerHour: 100, status: 'ACTIVE' };
const BACKDROP_NO_CARRINHO = { ...BACKDROP, pricePerHour: 200 };

const SECAO = 'Palco e estruturas (opcional)';

const abrir = async (carrinho: Record<string, unknown>, rotas: Record<string, unknown> = {}) => {
  // Cada abertura começa sem a lista guardada da anterior (a lista fica 5 minutos guardada no navegador).
  resetStructureCatalogCache();
  useAuth.mockReturnValue({ user: USUARIO, setAuthenticatedUser: vi.fn(), isLoading: false });
  useCart.mockReturnValue({ cart: { kit: null, equipments: [], services: [], ...carrinho }, isLoading: false, clearCart: vi.fn().mockResolvedValue(undefined) });
  const servidor: Record<string, unknown> = {
    '/equipments/pricing-rules': { equipmentPriceUnit: 'day', kitPrice: 'PER_EVENT' },
    '/services': [],
    '/equipments': CATALOGO,
    '/kits/kit-06': KIT_DETALHE,
    '/kits/kit-r': KIT_RETIRADA,
    ...rotas,
  };
  apiFetch.mockImplementation((url: string) => {
    const resposta = servidor[url];
    if (resposta instanceof Error) return Promise.reject(resposta);
    return Promise.resolve(url in servidor ? resposta : null);
  });
  render(
    <MemoryRouter initialEntries={['/orcamento']}>
      <Routes>
        <Route path="/orcamento" element={<QuoteRequestPage />} />
        <Route path="/orcamento-sucesso/:id" element={<p>Pedido enviado</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/equipments/pricing-rules'));
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  return servidor;
};

const botaoDaSecao = () => screen.getByRole('button', { name: SECAO });
const caixas = () =>
  within(screen.getByRole('region', { name: SECAO }))
    .queryAllByRole('checkbox')
    .map((caixa) => (caixa as HTMLInputElement).labels?.[0]?.textContent ?? '');
const subtotal = () => (screen.getByText('Subtotal estimado').parentElement as HTMLElement).textContent ?? '';

// Evento de dois dias: das 18h do dia 10 às 23h do dia 11 (29 h = 2 diárias).
const doisDias = () => {
  fireEvent.change(screen.getByLabelText('Data do Evento *'), { target: { value: '2030-01-10' } });
  fireEvent.change(screen.getByLabelText('Data do término (opcional)'), { target: { value: '2030-01-11' } });
  fireEvent.change(screen.getByLabelText('Início do evento *'), { target: { value: '18:00' } });
  fireEvent.change(screen.getByLabelText('Término do evento *'), { target: { value: '23:00' } });
};

const enviar = async () => {
  const campos: Array<[string, string]> = [
    ['Nome/Local do Evento *', 'Espaço VIP'], ['CEP *', '30110-000'], ['Rua *', 'Av. Brasil'], ['Número *', '123'],
    ['Bairro *', 'Centro'], ['Cidade *', 'Belo Horizonte'], ['Estado *', 'MG'],
  ];
  for (const [label, value] of campos) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  for (const grupo of ['Local com escadas? *', 'Local coberto? *', 'Tem estacionamento? *']) {
    fireEvent.click(within(screen.getByRole('group', { name: grupo })).getByLabelText('Sim'));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pedido de Orçamento' }));
  await waitFor(() => expect(post.mock.calls.some((c) => c[0] === '/bookings')).toBe(true));
  return post.mock.calls.find((c) => c[0] === '/bookings')![1] as { kitId?: string; equipmentIds?: string[] };
};

describe('QuoteRequestPage — palco e estruturas à parte (13/11/2026)', { timeout: 30000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    post.mockImplementation((url: string) => Promise.resolve(url === '/bookings' ? { data: { id: 'XP-NOVA' } } : { data: { valid: false } }));
  });

  it('kit de entrega: seção recolhível com as estruturas ativas pela categoria, sem a que o kit traz nem a que já está no carrinho', async () => {
    await abrir({ kit: KIT_CARRINHO, equipments: [BACKDROP_NO_CARRINHO] });

    // Começa recolhida; o aria-controls só aponta para a lista quando ela está na página.
    expect(botaoDaSecao()).toHaveAttribute('aria-expanded', 'false');
    expect(botaoDaSecao()).not.toHaveAttribute('aria-controls');
    expect(screen.queryByLabelText('Tablado de Palco Modular')).not.toBeInTheDocument();

    fireEvent.click(botaoDaSecao());
    expect(botaoDaSecao()).toHaveAttribute('aria-expanded', 'true');
    expect(botaoDaSecao()).toHaveAttribute('aria-controls', 'palco-e-estruturas-itens');
    expect(document.getElementById('palco-e-estruturas-itens')).toContainElement(screen.getByLabelText('Tablado de Palco Modular'));
    // Fora: o Backdrop (no carrinho), a Trave Low-Ground (no kit, pela página do kit), a tenda "em breve" e a luz "de palco".
    expect(caixas()).toEqual(['Tablado de Palco Modular', 'Trave Multiuso Pro']);
    expect(screen.getByText('Palco, traves, backdrop e tenda são cobrados por diária. O que você marcar entra na estimativa e vai no pedido.')).toBeInTheDocument();
    expect(screen.getByText('Luzes no alto (moving heads) precisam de trave ou totens.')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/kits/kit-06');
  });

  it('marcar soma no subtotal a diária vezes as diárias do evento e manda a estrutura no pedido como equipamento', async () => {
    await abrir({ kit: KIT_CARRINHO, equipments: [BACKDROP_NO_CARRINHO] });
    doisDias();
    fireEvent.click(botaoDaSecao());

    const tablado = screen.getByLabelText('Tablado de Palco Modular');
    expect(tablado).toHaveAccessibleDescription(/^R\$\s400,00\/diária · 2 diárias no evento: R\$\s800,00\.$/);
    // Kit R$ 1.500 + Backdrop do carrinho (R$ 200 × 2 diárias).
    expect(subtotal()).toMatch(/1\.900,00/);
    fireEvent.click(tablado);
    expect(subtotal()).toMatch(/2\.700,00/);

    const pedido = await enviar();
    expect(pedido.kitId).toBe('kit-06');
    expect(pedido.equipmentIds).toEqual(['eq-backdrop', 'eq-tablado']);
  });

  it('equipamento avulso sem kit: a seção aparece; desmarcada não vai, e recolher mantém o que foi marcado', async () => {
    await abrir({ equipments: [CAIXA] });
    doisDias();
    fireEvent.click(botaoDaSecao());
    // Sem kit, a Trave Low-Ground também é oferecida.
    expect(caixas()).toEqual(['Backdrop', 'Tablado de Palco Modular', 'Trave Low-Ground', 'Trave Multiuso Pro']);

    fireEvent.click(screen.getByLabelText('Backdrop'));
    fireEvent.click(screen.getByLabelText('Backdrop'));
    fireEvent.click(screen.getByLabelText('Trave Multiuso Pro'));
    fireEvent.click(botaoDaSecao());
    expect(screen.queryByLabelText('Trave Multiuso Pro')).not.toBeInTheDocument();
    expect(screen.getByText('Marcados: Trave Multiuso Pro.')).toBeInTheDocument();
    // Caixa R$ 100 × 2 diárias + Trave R$ 200 × 2 diárias.
    expect(subtotal()).toMatch(/600,00/);

    expect((await enviar()).equipmentIds).toEqual(['eq-caixa', 'eq-trave']);
  });

  it('só o kit de retirada: sem a seção e sem consultar o catálogo; com equipamento avulso junto, a seção aparece', async () => {
    await abrir({ kit: KIT_RETIRADA });
    expect(screen.queryByRole('button', { name: SECAO })).not.toBeInTheDocument();
    expect(apiFetch.mock.calls.some((c) => c[0] === '/equipments')).toBe(false);
    cleanup();
    vi.clearAllMocks();

    await abrir({ kit: KIT_RETIRADA, equipments: [CAIXA] });
    fireEvent.click(await screen.findByRole('button', { name: SECAO }));
    expect(caixas()).toEqual(['Backdrop', 'Tablado de Palco Modular', 'Trave Low-Ground', 'Trave Multiuso Pro']);
  });

  it('estrutura marcada que deixou de estar ativa: o pedido recusado relê a lista; ela sai da seção e do pedido, com o nome no aviso', async () => {
    const servidor = await abrir({ kit: KIT_CARRINHO });
    doisDias();
    fireEvent.click(botaoDaSecao());
    fireEvent.click(screen.getByLabelText('Tablado de Palco Modular'));
    fireEvent.click(screen.getByLabelText('Trave Multiuso Pro'));
    // O Tablado entrou em manutenção depois que a página abriu; o servidor recusa o pedido.
    servidor['/equipments'] = CATALOGO.map((eq) => (eq.id === 'eq-tablado' ? { ...eq, status: 'MAINTENANCE' } : eq));
    post.mockImplementationOnce(() =>
      Promise.reject(new Error('Um dos equipamentos do pedido não está disponível agora (1 item). Tire-o do carrinho e envie o pedido de novo.')),
    );
    expect((await enviar()).equipmentIds).toEqual(['eq-tablado', 'eq-trave']);

    const aviso = (await screen.findByText(/Saiu do pedido por não estar disponível agora/)).closest('[role="alert"]') as HTMLElement;
    expect(aviso).toHaveTextContent('Tablado de Palco Modular');
    expect(aviso).not.toHaveTextContent('Trave Multiuso Pro');
    expect(screen.queryByLabelText('Tablado de Palco Modular')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Trave Multiuso Pro')).toBeChecked();
    // Kit R$ 1.500 + Trave R$ 200 × 2 diárias.
    expect(subtotal()).toMatch(/1\.900,00/);

    // O reenvio vai sem o Tablado; o aviso sai a cada envio (aqui o servidor falha por outro motivo).
    post.mockImplementationOnce(() => Promise.reject(new Error('Erro ao salvar pedido.')));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pedido de Orçamento' }));
    await waitFor(() => expect(post.mock.calls.filter((call) => call[0] === '/bookings')).toHaveLength(2));
    expect((post.mock.calls.filter((call) => call[0] === '/bookings')[1][1] as { equipmentIds?: string[] }).equipmentIds).toEqual(['eq-trave']);
    await waitFor(() => expect(screen.queryByText(/Saiu do pedido/)).not.toBeInTheDocument());
  });

  it('pedido recusado por item indisponível e a releitura da lista falha: fica a lista de antes, com o que foi marcado, sem aviso', async () => {
    const servidor = await abrir({ kit: KIT_CARRINHO });
    doisDias();
    fireEvent.click(botaoDaSecao());
    fireEvent.click(screen.getByLabelText('Tablado de Palco Modular'));
    servidor['/equipments'] = new Error('rede fora');
    post.mockImplementationOnce(() =>
      Promise.reject(new Error('Um dos equipamentos do pedido não está disponível agora (1 item). Tire-o do carrinho e envie o pedido de novo.')),
    );
    await enviar();
    await waitFor(() => expect(apiFetch.mock.calls.filter((call) => call[0] === '/equipments')).toHaveLength(2));
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(screen.getByLabelText('Tablado de Palco Modular')).toBeChecked();
    expect(caixas()).toEqual(['Backdrop', 'Tablado de Palco Modular', 'Trave Multiuso Pro']);
    expect(screen.queryByText(/Saiu do pedido/)).not.toBeInTheDocument();
  });

  it('sem a composição do kit (GET /kits/:id falhou), nada é oferecido junto com o kit; com ela, a seção aparece', async () => {
    await abrir({ kit: KIT_CARRINHO }, { '/kits/kit-06': new Error('rede fora') });
    expect(screen.queryByRole('button', { name: SECAO })).not.toBeInTheDocument();
    cleanup();
    vi.clearAllMocks();

    await abrir({ kit: KIT_CARRINHO });
    fireEvent.click(await screen.findByRole('button', { name: SECAO }));
    expect(caixas()).toEqual(['Backdrop', 'Tablado de Palco Modular', 'Trave Multiuso Pro']);
  });
});
