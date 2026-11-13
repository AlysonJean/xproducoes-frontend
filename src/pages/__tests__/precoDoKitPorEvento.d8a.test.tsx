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
import { ComparePage } from '../ComparePage';
import type { Kit } from '../../types/types';

const KIT = {
  id: 'kit-combo',
  slug: 'combo-festa',
  name: 'Combo Festa',
  description: 'Caixa e mesa',
  price: 149.99,
  imageUrl: '',
  items: [
    { quantity: 1, equipment: { id: 'eq-caixa', name: 'Caixa Ativa', pricePerHour: 100 } },
    { quantity: 1, equipment: { id: 'eq-mesa', name: 'Mesa de Som', pricePerHour: 100 } },
  ],
  experienceLevels: [],
};

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

// Revisão do D8a/P16 com a decisão do dono de 06/11: o servidor passa a cobrar o kit pelo preço do evento
// (nunca vezes as horas). O cartão do kit já dizia "por evento", mas a página do kit, os níveis, o carrinho e a
// comparação ainda diziam "/ hora", e o aviso do carrinho prometia o kit multiplicado pelas horas.
describe('Preço do kit por evento em toda tela pública (D8a/P16, decisão de 06/11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCart.mockReturnValue({ cart: null, addItem: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn(), itemCount: 0 });
    useCompare.mockReturnValue({ items: [], removeItem: vi.fn(), clearCompare: vi.fn() });
  });

  it('cartão do kit: "por evento"', () => {
    comRotas(<KitCard kit={KIT as unknown as Kit} />);
    expect(screen.getByText('por evento')).toBeInTheDocument();
    expect(screen.queryByText('/ hora')).not.toBeInTheDocument();
  });

  it('página do kit: preço "por evento" e a economia sem "/ hora"', async () => {
    apiFetch.mockResolvedValue(KIT);
    comRotas(<KitDetailPage />, '/kits/:slug', '/kits/combo-festa');

    expect(await screen.findByText('por evento')).toBeInTheDocument();
    expect(screen.queryByText('/ hora')).not.toBeInTheDocument();
    expect(screen.getByText(/^ECONOMIZE/).textContent).not.toMatch(/\/h/);
    const economia = screen.getByText('Sua economia imediata:').nextElementSibling as HTMLElement;
    expect(economia.textContent).not.toMatch(/hora/);
  });

  // Auditoria do orçamento (12/11/2026), O4/B1: os níveis do kit saíram do site (o caso "níveis do kit" saiu junto).

  it('carrinho: kit "por evento", equipamento "/ hora" e o aviso não multiplica o kit pelas horas', () => {
    useCart.mockReturnValue({
      cart: { kit: { id: KIT.id, name: KIT.name, price: KIT.price }, equipments: [{ id: 'eq-caixa', name: 'Caixa Ativa', pricePerHour: 100 }], services: [] },
      addItem: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn(), itemCount: 2,
    });
    comRotas(<CartPage />);

    expect(screen.getByText('por evento')).toBeInTheDocument();
    expect(screen.getAllByText('/ hora')).toHaveLength(1);
    expect(screen.queryByText(/Kits serão multiplicados/)).not.toBeInTheDocument();
    expect(screen.getByText(/Kits têm preço por evento/)).toBeInTheDocument();
  });

  it('comparação: kit "por evento", equipamento "/ hora"', () => {
    useCompare.mockReturnValue({
      items: [
        { id: KIT.id, name: KIT.name, price: KIT.price, type: 'kit' },
        { id: 'eq-caixa', name: 'Caixa Ativa', price: 100, type: 'equipment' },
      ],
      removeItem: vi.fn(),
      clearCompare: vi.fn(),
    });
    comRotas(<ComparePage />);

    expect(screen.getByText('por evento')).toBeInTheDocument();
    expect(screen.getAllByText('/ hora')).toHaveLength(1);
  });
});
