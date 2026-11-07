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
vi.mock('../../components/SEO', () => ({ SEO: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { CartPage } from '../client/CartPage';
import { ComparePage } from '../ComparePage';

// Lote 13, diária nas telas (decisão do dono de 06/11). Carrinho e comparação guardam os itens no navegador
// e diziam "/ hora" fixo no equipamento avulso. A unidade é a da chave do servidor, lida na hora
// (GET /equipments/pricing-rules), também para o item guardado antes de a chave virar.
const comRotas = (ui: ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={ui} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
const chave = (unidade: 'hour' | 'day') =>
  apiFetch.mockImplementation((url: string) =>
    Promise.resolve(url === '/equipments/pricing-rules' ? { equipmentPriceUnit: unidade, kitPrice: 'PER_EVENT' } : []),
  );

const CARRINHO = {
  equipments: [{ id: 'eq-caixa', name: 'Caixa Ativa', pricePerHour: 720 }],
  services: [{ id: 'sv-op', name: 'Operador', price: 300 }],
};

describe('Diária no carrinho e na comparação (lote 13)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCart.mockReturnValue({ cart: CARRINHO, addItem: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn(), itemCount: 2 });
    useCompare.mockReturnValue({ items: [], removeItem: vi.fn(), clearCompare: vi.fn() });
  });

  it('carrinho com a chave "day": equipamento "/ diária" e o aviso fala em diárias, não em duração', async () => {
    chave('day');
    comRotas(<CartPage />);

    expect(await screen.findByText('/ diária')).toBeInTheDocument();
    expect(screen.queryByText('/ hora')).not.toBeInTheDocument();
    expect(screen.getByText('/ serviço')).toBeInTheDocument();
    expect(screen.getByText(/equipamentos avulsos são cobrados por diária \(cada 24 horas do evento, com o mínimo de diárias de cada um\)/)).toBeInTheDocument();
    expect(screen.queryByText(/multiplicados pela duração/)).not.toBeInTheDocument();
  });

  it('carrinho com a chave "hour": os textos de hoje', async () => {
    chave('hour');
    comRotas(<CartPage />);

    expect(await screen.findByText('/ hora')).toBeInTheDocument();
    expect(screen.getByText(/equipamentos avulsos são multiplicados pela duração do seu evento/)).toBeInTheDocument();
  });

  it('comparação com a chave "day": equipamento "/ diária"; serviço "/ serviço"', async () => {
    chave('day');
    useCompare.mockReturnValue({
      items: [
        { id: 'eq-caixa', name: 'Caixa Ativa', price: 720, type: 'equipment' },
        { id: 'sv-op', name: 'Operador', price: 300, type: 'service' },
      ],
      removeItem: vi.fn(),
      clearCompare: vi.fn(),
    });
    comRotas(<ComparePage />);

    expect(await screen.findByText('/ diária')).toBeInTheDocument();
    expect(screen.queryByText('/ hora')).not.toBeInTheDocument();
    expect(screen.getByText('/ serviço')).toBeInTheDocument();
  });
});
