import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const { apiFetch, useCart, useCompare, addNotification, addItem } = vi.hoisted(() => ({
  apiFetch: vi.fn(), useCart: vi.fn(), useCompare: vi.fn(), addNotification: vi.fn(), addItem: vi.fn(),
}));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('../../hooks/useCart', () => ({ useCart }));
vi.mock('../../contexts/CompareContext', () => ({ useCompare }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../hooks/useRecommendations', () => ({ useRecommendations: () => ({ recommendations: [], loading: false }) }));
vi.mock('../../components/ui/RecommendationSection', () => ({ RecommendationSection: () => null }));
vi.mock('../../components/ui/FavoriteButton', () => ({ FavoriteButton: () => null }));
vi.mock('../../components/ui/CompareButton', () => ({ default: () => null }));
vi.mock('../../components/ui/AskOnWhatsAppButton', () => ({ AskOnWhatsAppButton: () => null }));
vi.mock('../../components/ui/ZoomableProductPhoto', () => ({ ZoomableProductPhoto: () => null }));
vi.mock('../../components/SEO', () => ({ SEO: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { KitDetailPage } from '../KitDetailPage';
import { resetStructureCatalogCache } from '../../utils/cartCatalog';

// Palco (13/11/2026): os Kits 06 (Banda) e 08 (Open Air) deixam de trazer o conjunto de palco, vendido à parte. A página
// do kit de entrega oferece os itens ativos da categoria "Estruturas" do catálogo (pela categoria, nunca pelo nome),
// com o preço da diária e o botão do orçamento; o item que o kit já traz não aparece. O kit de retirada não mostra.

const ESTRUTURAS = { id: 'cat-est', name: 'Estruturas' };
const ILUMINACAO = { id: 'cat-luz', name: 'Iluminação' };
// O equipamento como GET /equipments devolve (Decimal em texto, a categoria e a unidade do preço junto).
const equip = (id: string, name: string, price: string, category: { id: string; name: string }, extra: Record<string, unknown> = {}) => ({
  id, slug: id, name, pricePerHour: price, priceUnit: 'day', status: 'ACTIVE', category, categoryId: category.id, ...extra,
});
const TABLADO = equip('eq-tablado', 'Tablado de Palco Modular', '400.00', ESTRUTURAS);
const TRAVE = equip('eq-trave', 'Trave Multiuso Pro', '200.00', { id: 'cat-est', name: 'ESTRUTURAS' });
const BACKDROP = equip('eq-backdrop', 'Backdrop', '200.00', ESTRUTURAS);
const LOW_GROUND = equip('eq-low', 'Trave Low-Ground', '150.00', ESTRUTURAS);
const TENDA_EM_MANUTENCAO = equip('eq-tenda', 'Tenda Gazebo', '300.00', ESTRUTURAS, { status: 'MAINTENANCE' });
const LUZ_DE_PALCO = equip('eq-luz', 'Luz de Palco', '80.00', ILUMINACAO);
const MOVING = equip('eq-moving', 'Moving Head', '120.00', ILUMINACAO);
const CATALOGO = [BACKDROP, LUZ_DE_PALCO, MOVING, TABLADO, TENDA_EM_MANUTENCAO, LOW_GROUND, TRAVE];

const item = (equipment: { id: string }) => ({ id: `it-${equipment.id}`, kitId: 'kit', equipmentId: equipment.id, quantity: 1, equipment });
// O kit como GET /kits/:slug devolve. O de entrega já traz a Trave Low-Ground.
const KIT_ENTREGA = {
  id: 'kit-banda', slug: 'kit-banda', name: 'Kit Banda', description: 'Banda ao vivo', price: '1500', imageUrl: '',
  status: 'ACTIVE', minimumRentalDuration: 5, extraHourPrice: '90.00', fulfillment: 'DELIVERY_SETUP', experienceLevels: [],
  items: [item(MOVING), item(LOW_GROUND)],
};
const KIT_RETIRADA = { ...KIT_ENTREGA, id: 'kit-resenha', slug: 'kit-resenha', name: 'Kit Resenha', fulfillment: 'CLIENT_PICKUP', items: [item(MOVING)] };

const SECAO = 'Vai precisar de palco ou estrutura?';

const abrir = async (kit: { slug: string }, cart: unknown = null, catalogo: unknown = CATALOGO) => {
  // Cada abertura começa sem a lista guardada da anterior (a lista fica 5 minutos guardada no navegador).
  resetStructureCatalogCache();
  useCart.mockReturnValue({ cart, addItem, removeItem: vi.fn(), clearCart: vi.fn(), itemCount: 0 });
  apiFetch.mockImplementation((url: string) => {
    if (url === `/kits/${kit.slug}`) return Promise.resolve(kit);
    if (url === '/equipments') return Promise.resolve(catalogo);
    if (url === '/equipments/pricing-rules') return Promise.resolve({ equipmentPriceUnit: 'day', kitPrice: 'PER_EVENT' });
    return Promise.resolve([]);
  });
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/kits/${kit.slug}`]}>
        <Routes>
          <Route path="/kits/:slug" element={<KitDetailPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
  await screen.findByText('por evento');
};

describe('Página do kit — palco e estruturas à parte (13/11/2026)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addItem.mockResolvedValue(true);
    useCompare.mockReturnValue({ items: [], removeItem: vi.fn(), clearCompare: vi.fn() });
  });

  it('kit de entrega: as estruturas ativas pela categoria, com a diária, a frase da diária e a dica da luz; sem o que o kit já traz', async () => {
    await abrir(KIT_ENTREGA);
    const secao = await screen.findByRole('region', { name: SECAO });

    expect(within(secao).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Backdrop', 'Tablado de Palco Modular', 'Trave Multiuso Pro']);
    expect(within(secao).getByText('Palco, traves, backdrop e tenda são cobrados por diária. Entram no orçamento à parte do kit.')).toBeInTheDocument();
    expect(within(secao).getByText('Luzes no alto (moving heads) precisam de trave ou totens.')).toBeInTheDocument();
    expect(within(secao).getByText(/^R\$\s400,00\/diária$/)).toBeInTheDocument();
    // Fora: a luz com "palco" no nome (outra categoria), a tenda em manutenção e a trave que o kit já traz.
    expect(within(secao).queryByText('Luz de Palco')).not.toBeInTheDocument();
    expect(within(secao).queryByText('Tenda Gazebo')).not.toBeInTheDocument();
    expect(within(secao).queryByText('Trave Low-Ground')).not.toBeInTheDocument();
    // A trave do kit segue na lista do que vem no kit.
    expect(screen.getByText('Trave Low-Ground')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/equipments');
  });

  it('"Adicionar ao orçamento" põe a estrutura no carrinho como equipamento (o addItem confere item ativo e repetido)', async () => {
    await abrir(KIT_ENTREGA);
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar ao orçamento: Tablado de Palco Modular' }));

    await waitFor(() => expect(addItem).toHaveBeenCalledTimes(1));
    expect(addItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'eq-tablado', name: 'Tablado de Palco Modular' }), 'equipment');
  });

  it('a estrutura que já está no carrinho aparece como "No orçamento", sem adicionar de novo', async () => {
    await abrir(KIT_ENTREGA, { equipments: [{ ...TABLADO, pricePerHour: 400 }], services: [] });

    // O nome acessível começa pelo texto que aparece no botão (comando de voz).
    const noOrcamento = await screen.findByRole('button', { name: 'No orçamento: Tablado de Palco Modular' });
    expect(noOrcamento).toBeDisabled();
    expect(noOrcamento).toHaveTextContent('No orçamento');
    const adicionar = screen.getByRole('button', { name: 'Adicionar ao orçamento: Backdrop' });
    expect(adicionar).toBeEnabled();
    expect(adicionar).toHaveTextContent('Adicionar ao orçamento');
  });

  it('kit de entrega mostra; kit de retirada não mostra nem consulta o catálogo', async () => {
    await abrir(KIT_ENTREGA);
    expect(await screen.findByRole('region', { name: SECAO })).toBeInTheDocument();
    cleanup();
    vi.clearAllMocks();

    await abrir(KIT_RETIRADA);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText(SECAO)).not.toBeInTheDocument();
    expect(screen.queryByText(/cobrados por diária/)).not.toBeInTheDocument();
    expect(apiFetch.mock.calls.some((c) => c[0] === '/equipments')).toBe(false);
  });

  it('catálogo sem estrutura ativa (só a luz "de palco" e a tenda em manutenção): sem a seção', async () => {
    await abrir(KIT_ENTREGA, null, [LUZ_DE_PALCO, TENDA_EM_MANUTENCAO, BACKDROP]);
    expect(await screen.findByRole('region', { name: SECAO })).toBeInTheDocument();
    cleanup();
    vi.clearAllMocks();

    await abrir(KIT_ENTREGA, null, [LUZ_DE_PALCO, TENDA_EM_MANUTENCAO]);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/equipments'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText(SECAO)).not.toBeInTheDocument();
  });
});
