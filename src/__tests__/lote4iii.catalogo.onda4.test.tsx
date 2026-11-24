import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Onda 4 da auditoria de 19/11, primeiro lote do site, catálogo: item sem preço diz "Sob consulta" (F3-16; era "a partir
// de R$ 0,00") e o catálogo público não mostra item inativo nem para o admin logado (F5-13).
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../hooks/useCart', () => ({ useCart: () => ({ addItem: vi.fn(), cart: null }) }));
vi.mock('@/hooks/useCart', () => ({ useCart: () => ({ addItem: vi.fn(), cart: null }) }));
vi.mock('../contexts/CartContext', () => ({ useCart: () => ({ cart: null, addToCart: vi.fn(), isInCart: () => false, addItem: vi.fn() }) }));
vi.mock('../contexts/CompareContext', () => ({ useCompare: () => ({ items: [], addItem: vi.fn(), removeItem: vi.fn() }) }));
vi.mock('../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../contexts/SettingsContext', () => ({ useSettings: () => ({ companyName: 'X Produções', googleReviewUrl: null }) }));
vi.mock('../components/ui/CompareButton', () => ({ default: () => null }));
vi.mock('../components/ui/FavoriteButton', () => ({ FavoriteButton: () => null }));
vi.mock('../components/ui/BannerCarousel', () => ({ BannerCarousel: () => null }));
vi.mock('../components/ui/BrandLoader', () => ({ BrandLoader: () => null }));

import { EquipmentCard } from '../components/ui/EquipmentCard';
import { KitCard } from '../components/ui/KitCard';
import { ServiceCard } from '../components/ui/ServiceCard';
import { EquipmentListPage } from '../pages/EquipmentListPage';
import { HomePage } from '../pages/HomePage';
import type { Equipment, Kit, Service } from '../types/types';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('F3-16: sem preço, "Sob consulta"', () => {
  const comRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

  it('equipamento, kit e serviço com preço 0', () => {
    comRouter(<EquipmentCard equipment={{ id: 'e1', name: 'Painel LED', pricePerHour: 0, isAvailable: true, status: 'ACTIVE' } as unknown as Equipment} />);
    comRouter(<KitCard kit={{ id: 'k1', name: 'Kit Palco', price: 0, status: 'ACTIVE', equipments: [] } as unknown as Kit} />);
    comRouter(<ServiceCard service={{ id: 's1', name: 'Técnico', price: 0, duration: 180, status: 'ACTIVE' } as unknown as Service} />);
    expect(screen.getAllByText('Sob consulta')).toHaveLength(3);
    expect(document.body.textContent).not.toContain('R$ 0,00');
  });

  it('com preço, segue "a partir de"', () => {
    comRouter(<EquipmentCard equipment={{ id: 'e1', name: 'Caixa', pricePerHour: 120, isAvailable: true, status: 'ACTIVE' } as unknown as Equipment} />);
    comRouter(<KitCard kit={{ id: 'k1', name: 'Kit 01', price: 890, status: 'ACTIVE', equipments: [] } as unknown as Kit} />);
    expect(screen.queryByText('Sob consulta')).not.toBeInTheDocument();
    expect(screen.getAllByText('a partir de')).toHaveLength(2);
  });
});

describe('F5-13: item inativo fora do catálogo público', () => {
  it('lista de equipamentos: o inativo não aparece (o servidor manda tudo ao admin logado)', async () => {
    apiFetch.mockImplementation(async (url: string) => {
      if (url === '/equipments') {
        return [
          { id: 'e1', name: 'Caixa Ativa', pricePerHour: 100, status: 'ACTIVE', quantity: 2 },
          { id: 'e2', name: 'Mesa Antiga Inativa', pricePerHour: 50, status: 'INACTIVE', quantity: 1 },
        ];
      }
      return [];
    });
    render(<HelmetProvider><MemoryRouter><EquipmentListPage /></MemoryRouter></HelmetProvider>);
    expect(await screen.findByText('Caixa Ativa')).toBeInTheDocument();
    expect(screen.queryByText('Mesa Antiga Inativa')).not.toBeInTheDocument();
  });

  it('página inicial: o kit inativo não aparece', async () => {
    apiFetch.mockImplementation(async (url: string) => {
      if (url === '/kits?limit=4') {
        return [
          { id: 'k1', name: 'Kit Festa Ativo', price: 900, status: 'ACTIVE', equipments: [] },
          { id: 'k2', name: 'Kit Velho Inativo', price: 500, status: 'INACTIVE', equipments: [] },
        ];
      }
      return [];
    });
    render(<HelmetProvider><MemoryRouter><HomePage /></MemoryRouter></HelmetProvider>);
    expect(await screen.findByText('Kit Festa Ativo', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByText('Kit Velho Inativo')).not.toBeInTheDocument();
  }, 20_000);
});
