import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const { apiFetch, useCart, useCompare } = vi.hoisted(() => ({ apiFetch: vi.fn(), useCart: vi.fn(), useCompare: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('../../hooks/useCart', () => ({ useCart }));
vi.mock('../../contexts/CompareContext', () => ({ useCompare }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../hooks/useRecommendations', () => ({ useRecommendations: () => ({ recommendations: [], loading: false }) }));
vi.mock('../../components/ui/RecommendationSection', () => ({ RecommendationSection: () => null }));
vi.mock('../../components/ui/FavoriteButton', () => ({ FavoriteButton: () => null }));
vi.mock('../../components/ui/CompareButton', () => ({ default: () => null }));
vi.mock('../../components/ui/AskOnWhatsAppButton', () => ({ AskOnWhatsAppButton: () => null }));
vi.mock('../../components/ui/ZoomableProductPhoto', () => ({ ZoomableProductPhoto: () => null }));
vi.mock('../../components/SEO', () => ({ SEO: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { KitCard } from '../../components/ui/KitCard';
import { KitDetailPage } from '../KitDetailPage';
import { CartPage } from '../client/CartPage';
import type { Kit } from '../../types/types';

// O kit como a API devolve: o Decimal da hora extra chega como texto.
const KIT = {
  id: 'kit-combo', slug: 'combo-club', name: 'Combo Club', description: 'Caixa e mesa', price: 149.99, imageUrl: '',
  items: [{ quantity: 1, equipment: { id: 'eq-caixa', name: 'Caixa Ativa', pricePerHour: 100 } }],
  experienceLevels: [],
};
const RETIRADA = { ...KIT, minimumRentalDuration: 4, extraHourPrice: '50.00', fulfillment: 'CLIENT_PICKUP' };
const ENTREGA = { ...KIT, minimumRentalDuration: null, extraHourPrice: null, fulfillment: 'DELIVERY_SETUP' };

const comRotas = (ui: ReactElement, path = '/', entry = '/') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

const paginaDoKit = async (kit: object) => {
  apiFetch.mockResolvedValue(kit);
  comRotas(<KitDetailPage />, '/kits/:slug', '/kits/combo-club');
  await screen.findByText('por evento');
};

// Lote 13, campos do kit (aprovados pelo dono em 06/11/2026). Onde o site mostra o preço do kit "por evento"
// (onda 1), passa a mostrar também as horas incluídas e o valor da hora extra, quando o kit tem, e o tipo do
// kit: na página, com uma frase simples; no cartão e no carrinho, em poucas palavras.
describe('Páginas públicas do kit — horas incluídas, hora extra e tipo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCart.mockReturnValue({ cart: null, addItem: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn(), itemCount: 0 });
    useCompare.mockReturnValue({ items: [], removeItem: vi.fn(), clearCompare: vi.fn() });
  });

  it('página do kit de retirada: horas incluídas, hora extra e a frase da retirada; sem prometer entrega', async () => {
    await paginaDoKit(RETIRADA);

    expect(screen.getByText(/^4 h incluídas no preço · hora extra: R\$\s50,00$/)).toBeInTheDocument();
    expect(screen.getByText('Retirada e montagem pelo cliente')).toBeInTheDocument();
    expect(screen.getByText('Você retira o kit na X Produções, em Belo Horizonte, monta no local e devolve depois do evento.')).toBeInTheDocument();
    expect(screen.queryByText('Entrega Ágil')).not.toBeInTheDocument();
    expect(screen.getByText(/configurados juntos antes da retirada/)).toBeInTheDocument();
  });

  it('página do kit de entrega sem horas incluídas: a frase da entrega e nada de horas', async () => {
    await paginaDoKit(ENTREGA);

    expect(screen.getByText('Entrega e montagem pela equipe')).toBeInTheDocument();
    expect(screen.getByText('A equipe da X Produções leva o kit ao local do evento, monta e busca depois. Se preferir, um técnico fica durante todo o evento, cobrado à parte.')).toBeInTheDocument();
    expect(screen.queryByText(/h incluídas/)).not.toBeInTheDocument();
    expect(screen.getByText('Entrega Ágil')).toBeInTheDocument();
  });

  it('horas incluídas sem valor de hora extra: só as horas', async () => {
    await paginaDoKit({ ...ENTREGA, minimumRentalDuration: 6 });
    expect(screen.getByText('6 h incluídas no preço')).toBeInTheDocument();
    expect(screen.queryByText(/hora extra/)).not.toBeInTheDocument();
  });

  it('hora extra sem horas incluídas não aparece (a reserva não a cobra)', async () => {
    await paginaDoKit({ ...ENTREGA, extraHourPrice: '80.00' });
    expect(screen.queryByText(/hora extra/)).not.toBeInTheDocument();
    expect(screen.queryByText(/h incluídas/)).not.toBeInTheDocument();
  });

  it('cartão do kit: o tipo em poucas palavras, com as horas incluídas quando tem', () => {
    const { unmount } = comRotas(<KitCard kit={RETIRADA as unknown as Kit} />);
    expect(screen.getByText('4 h incluídas · Retirada pelo cliente')).toBeInTheDocument();
    unmount();

    comRotas(<KitCard kit={ENTREGA as unknown as Kit} />);
    expect(screen.getByText('Entrega e montagem')).toBeInTheDocument();
  });

  it('carrinho: o kit mostra o tipo e as horas, e o aviso fala da hora extra', () => {
    useCart.mockReturnValue({
      cart: { kit: { id: KIT.id, name: KIT.name, price: KIT.price, minimumRentalDuration: 4, extraHourPrice: '50.00', fulfillment: 'CLIENT_PICKUP' }, equipments: [], services: [] },
      addItem: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn(), itemCount: 1,
    });
    comRotas(<CartPage />);

    expect(screen.getByText('4 h incluídas · Retirada pelo cliente')).toBeInTheDocument();
    expect(screen.getByText(/Kits têm preço por evento, com hora extra quando o evento passa das horas incluídas no kit/)).toBeInTheDocument();
  });
});
