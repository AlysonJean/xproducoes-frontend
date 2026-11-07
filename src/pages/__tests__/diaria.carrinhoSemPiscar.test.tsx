import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const { apiFetch, useCart } = vi.hoisted(() => ({ apiFetch: vi.fn(), useCart: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../hooks/useCart', () => ({ useCart }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../hooks/useRecommendations', () => ({ useRecommendations: () => ({ recommendations: [], loading: false }) }));
vi.mock('../../components/ui/RecommendationSection', () => ({ RecommendationSection: () => null }));
vi.mock('../../components/ui/CompareButton', () => ({ default: () => null }));
vi.mock('../../components/ui/FavoriteButton', () => ({ FavoriteButton: () => null }));
vi.mock('../../components/SEO', () => ({ SEO: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { EquipmentCard } from '../../components/ui/EquipmentCard';
import { CartPage } from '../client/CartPage';
import type { Equipment } from '../../types/types';

// Lote 13, diária nas telas (decisão do dono de 06/11). O cartão do catálogo lê a unidade do próprio
// equipamento (priceUnit) e não consulta a chave; o carrinho lê a chave. Sem guardar a unidade do cartão, quem
// ia do catálogo ao carrinho via o equipamento com "/ hora" até a consulta voltar, e só então "/ diária".
const CAIXA = { id: 'eq-caixa', slug: 'caixa-ativa', name: 'Caixa Ativa', pricePerHour: 720, isAvailable: true, status: 'ACTIVE' };

describe('Do catálogo ao carrinho, sem "/ hora" piscando (lote 13)', () => {
  it('depois do cartão com priceUnit "day", o carrinho mostra "/ diária" já na primeira pintura, com a chave ainda sem resposta', () => {
    apiFetch.mockImplementation(() => new Promise(() => undefined)); // a consulta à chave não volta
    const catalogo = render(
      <MemoryRouter>
        <EquipmentCard equipment={{ ...CAIXA, priceUnit: 'day' } as Equipment} />
      </MemoryRouter>,
    );
    expect(catalogo.container.textContent).toContain('/ diária');
    expect(apiFetch).not.toHaveBeenCalledWith('/equipments/pricing-rules'); // o cartão não pergunta a chave
    catalogo.unmount();

    useCart.mockReturnValue({
      cart: { equipments: [{ id: 'eq-caixa', name: 'Caixa Ativa', pricePerHour: 720 }], services: [] },
      addItem: vi.fn(),
      removeItem: vi.fn(),
      clearCart: vi.fn(),
      itemCount: 1,
    });
    render(
      <HelmetProvider>
        <MemoryRouter>
          <CartPage />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(screen.getByText('/ diária')).toBeInTheDocument();
    expect(screen.queryByText('/ hora')).not.toBeInTheDocument();
    expect(screen.getByText(/equipamentos avulsos são cobrados por diária/)).toBeInTheDocument();
  });
});
