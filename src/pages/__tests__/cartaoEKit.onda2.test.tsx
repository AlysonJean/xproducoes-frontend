import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Onda 2 da auditoria de 19/11: F3-06 (os botões Comparar e Favoritar ficavam dentro do link do cartão de equipamento) e
// F5-06 (o preço "de" riscado do kit aparecia sempre, até menor que o preço do kit).
const { apiFetch, useCart, useCompare } = vi.hoisted(() => ({ apiFetch: vi.fn(), useCart: vi.fn(), useCompare: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../hooks/useCart', () => ({ useCart }));
vi.mock('../../contexts/CompareContext', () => ({ useCompare }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../hooks/useRecommendations', () => ({ useRecommendations: () => ({ recommendations: [], loading: false }) }));
vi.mock('../../components/ui/RecommendationSection', () => ({ RecommendationSection: () => null }));
vi.mock('../../components/ui/FavoriteButton', () => ({ FavoriteButton: () => <button type="button">Favoritar</button> }));
vi.mock('../../components/ui/CompareButton', () => ({ default: () => <button type="button">Comparar</button> }));
vi.mock('../../components/ui/AskOnWhatsAppButton', () => ({ AskOnWhatsAppButton: () => null }));
vi.mock('../../components/ui/ZoomableProductPhoto', () => ({ ZoomableProductPhoto: () => null }));
vi.mock('../../components/SEO', () => ({ SEO: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { EquipmentCard } from '../../components/ui/EquipmentCard';
import { KitDetailPage } from '../KitDetailPage';
import type { Equipment } from '../../types/types';

const comRotas = (ui: ReactElement, path = '/', entry = '/') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes><Route path={path} element={ui} /></Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  apiFetch.mockResolvedValue({ equipmentPriceUnit: 'hour', kitPrice: 'PER_EVENT' });
  useCart.mockReturnValue({ cart: null, addItem: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn(), itemCount: 0 });
  useCompare.mockReturnValue({ items: [], removeItem: vi.fn(), clearCompare: vi.fn() });
});

describe('F3-06: cartão de equipamento', () => {
  it('os botões ficam fora do link, e o nome do link não leva os rótulos deles', () => {
    const caixa = { id: 'eq1', slug: 'caixa-ativa', name: 'Caixa Ativa', pricePerHour: 100, isAvailable: true, status: 'ACTIVE' } as unknown as Equipment;
    comRotas(<EquipmentCard equipment={caixa} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/equipamentos/caixa-ativa');
    expect(link.querySelector('button')).toBeNull();
    expect(link.textContent).not.toMatch(/Comparar|Favoritar/);
    expect(screen.getByRole('button', { name: 'Comparar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Favoritar' })).toBeInTheDocument();
  });
});

describe('F5-06: preço "de" riscado do kit', () => {
  const kit = (price: number, itemPrice: number) => ({
    id: 'kit-1', slug: 'kit-festa', name: 'Kit Festa', description: 'Caixa', price, imageUrl: '', experienceLevels: [],
    items: [{ quantity: 1, equipment: { id: 'eq1', name: 'Caixa Ativa', pricePerHour: itemPrice } }],
  });
  const riscado = () => document.querySelector('.line-through');

  it('com economia de verdade: o "de" riscado aparece', async () => {
    apiFetch.mockResolvedValue(kit(150, 400));
    comRotas(<KitDetailPage />, '/kits/:slug', '/kits/kit-festa');
    await screen.findByText('por evento');
    expect(riscado()).not.toBeNull();
  });

  it('itens somando menos que o kit: sem o riscado (antes mostrava um "de" menor que o "por")', async () => {
    apiFetch.mockResolvedValue(kit(500, 100));
    comRotas(<KitDetailPage />, '/kits/:slug', '/kits/kit-festa');
    await screen.findByText('por evento');
    expect(riscado()).toBeNull();
    expect(screen.queryByText(/^ECONOMIZE/)).not.toBeInTheDocument();
  });
});
