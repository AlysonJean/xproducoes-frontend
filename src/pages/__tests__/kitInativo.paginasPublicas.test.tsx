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

import { KitDetailPage } from '../KitDetailPage';
import { KitListPage } from '../KitListPage';

const KIT = {
  id: 'kit-combo', slug: 'combo-club', name: 'Combo Club', description: 'Caixa e mesa', price: 149.99, imageUrl: '',
  items: [{ quantity: 1, equipment: { id: 'eq-caixa', name: 'Caixa Ativa', pricePerHour: 100 } }],
  experienceLevels: [], minimumRentalDuration: null, extraHourPrice: null, fulfillment: 'DELIVERY_SETUP',
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

const paginaDoKit = async (kit: object) => {
  apiFetch.mockResolvedValue(kit);
  comRotas(<KitDetailPage />, '/kits/:slug', '/kits/combo-club');
  await screen.findByText('por evento');
};

// Conferência de 08/11/2026: o kit inativo abre pelo link direto (decisão do dono), mas a página deixava pedir; e,
// logado como admin, a lista pública mostrava o kit inativo sem selo (GET /kits traz os inativos para o admin).
describe('Páginas públicas do kit — kit que não está ativo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCart.mockReturnValue({ cart: null, addItem: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn(), itemCount: 0 });
    useCompare.mockReturnValue({ items: [], removeItem: vi.fn(), clearCompare: vi.fn() });
  });

  it.each([['INACTIVE'], ['COMING_SOON'], ['MAINTENANCE']])('kit %s pelo link: abre, mas o botão diz "Indisponível no momento" e não deixa pedir', async (status) => {
    await paginaDoKit({ ...KIT, status });

    const botao = screen.getByRole('button', { name: 'Indisponível no momento' });
    expect(botao).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Adicionar combo ao orçamento' })).not.toBeInTheDocument();
  });

  it('kit ativo: segue com "Adicionar combo ao orçamento"', async () => {
    await paginaDoKit({ ...KIT, status: 'ACTIVE' });

    expect(screen.getByRole('button', { name: 'Adicionar combo ao orçamento' })).toBeEnabled();
  });

  it('lista pública: o kit inativo que a API manda ao admin fica fora, como para o visitante', async () => {
    apiFetch.mockResolvedValue([
      { ...KIT, status: 'ACTIVE' },
      { ...KIT, id: 'kit-teste', slug: 'kit-teste', name: 'Kit Teste Inativo', status: 'INACTIVE' },
    ]);
    comRotas(<KitListPage />);

    expect(await screen.findByText('Combo Club')).toBeInTheDocument();
    expect(screen.queryByText('Kit Teste Inativo')).not.toBeInTheDocument();
  });
});
