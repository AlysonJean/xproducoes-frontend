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

// Item A (lote 16, A08 aprovada em 02/11/2026): com a coluna isPopular criada pela migration de base, o servidor volta
// a gravar e a devolver o destaque que o dono marca no painel. A página pública do kit mostra o selo "Mais Popular"
// só no nível marcado, e a dica "o mais popular" aponta para ele. Kit sem nível marcado (todos os de antes da
// migration: a coluna nasce false) não mostra selo nem dica.
const nivel = (id: string, level: string, price: string, isPopular?: boolean) => ({
  id, level, price, description: `Nível ${level}`, includes: ['Caixas'], kitId: 'kit-combo',
  ...(isPopular === undefined ? {} : { isPopular }),
  createdAt: '2026-11-12T12:00:00.000Z', updatedAt: '2026-11-12T12:00:00.000Z',
});
// O kit como a API devolve (o Decimal do preço do nível chega como texto).
const kit = (niveis: object[]) => ({
  id: 'kit-combo', slug: 'combo-club', name: 'Combo Club', description: 'Caixa e mesa', price: 149.99, imageUrl: '',
  items: [{ quantity: 1, equipment: { id: 'eq-caixa', name: 'Caixa Ativa', pricePerHour: 100 } }],
  experienceLevels: niveis,
});

const paginaDoKit = async (dados: object) => {
  apiFetch.mockResolvedValue(dados);
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/kits/combo-club']}>
        <Routes>
          <Route path="/kits/:slug" element={<KitDetailPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
  await screen.findByText('Escolha seu Nível de Experiência');
};

describe('Página do kit — selo "Mais Popular" só no nível marcado no painel (item A, lote 16)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCart.mockReturnValue({ cart: null, addItem: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn(), itemCount: 0 });
    useCompare.mockReturnValue({ items: [], removeItem: vi.fn(), clearCompare: vi.fn() });
  });

  it('o Gold marcado: um selo só, no cartão do Gold, e a dica aponta para ele', async () => {
    await paginaDoKit(kit([
      nivel('n1', 'SILVER', '150.00', false),
      nivel('n2', 'GOLD', '300.00', true),
      nivel('n3', 'PLATINUM', '600.00', false),
    ]));

    const selos = screen.getAllByText('Mais Popular');
    expect(selos).toHaveLength(1);
    const cartao = selos[0].closest('button');
    expect(cartao).toHaveTextContent('Gold');
    expect(cartao).not.toHaveTextContent('Silver');
    expect(screen.getByText(/o mais popular/).textContent).toContain('Gold');
  });

  it('o Platinum marcado: o selo vai para ele, não para o Gold', async () => {
    await paginaDoKit(kit([nivel('n1', 'GOLD', '300.00', false), nivel('n2', 'PLATINUM', '600.00', true)]));

    expect(screen.getAllByText('Mais Popular')).toHaveLength(1);
    expect(screen.getByText('Mais Popular').closest('button')).toHaveTextContent('Platinum');
    expect(screen.getByText(/o mais popular/).textContent).toContain('Platinum');
  });

  it('nenhum nível marcado (ou campo ausente): sem selo e sem dica', async () => {
    await paginaDoKit(kit([nivel('n1', 'SILVER', '150.00', false), nivel('n2', 'GOLD', '300.00')]));

    expect(screen.queryByText('Mais Popular')).not.toBeInTheDocument();
    expect(screen.queryByText(/o mais popular/)).not.toBeInTheDocument();
  });
});
