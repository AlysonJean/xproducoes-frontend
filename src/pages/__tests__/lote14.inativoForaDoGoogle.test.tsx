import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const { apiFetch, useCart, seo } = vi.hoisted(() => ({ apiFetch: vi.fn(), useCart: vi.fn(), seo: [] as Array<{ title: string; noindex?: boolean }> }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('../../hooks/useCart', () => ({ useCart }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../hooks/useRecommendations', () => ({ useRecommendations: () => ({ recommendations: [], loading: false }) }));
vi.mock('../../components/ui/RecommendationSection', () => ({ RecommendationSection: () => null }));
vi.mock('../../components/ui/FavoriteButton', () => ({ FavoriteButton: () => null }));
vi.mock('../../components/ui/CompareButton', () => ({ default: () => null }));
vi.mock('../../components/ui/AskOnWhatsAppButton', () => ({ AskOnWhatsAppButton: () => null }));
vi.mock('../../components/ui/ZoomableProductPhoto', () => ({ ZoomableProductPhoto: () => null }));
vi.mock('../../components/SEO', () => ({ SEO: (props: { title: string; noindex?: boolean }) => { seo.push(props); return null; } }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { EquipmentDetailPage } from '../EquipmentDetailPage';
import { KitDetailPage } from '../KitDetailPage';
import { ServiceDetailPage } from '../ServiceDetailPage';

// D23, o que ficou dela na decisão do dono de 08/11/2026: a página do item INATIVO continua abrindo pelo link direto,
// com o botão desligado (links já enviados a clientes funcionam), mas sai do Google: noindex. Manutenção e "em breve"
// seguem indexados.
const CAIXA = {
  id: 'eq-caixa', slug: 'caixa', name: 'Caixa Ativa', description: 'Caixa', pricePerHour: 100, priceUnit: 'hour',
  minimumRentalDuration: 1, quantity: 2, categoryId: 'cat-som', category: { id: 'cat-som', name: 'Som' }, tags: [],
};
const KIT = {
  id: 'kit-combo', slug: 'kit', name: 'Combo Club', description: 'Caixa e mesa', price: 149.99, imageUrl: '',
  items: [{ quantity: 1, equipment: { id: 'eq-caixa', name: 'Caixa Ativa', pricePerHour: 100 } }],
  experienceLevels: [], minimumRentalDuration: null, extraHourPrice: null, fulfillment: 'DELIVERY_SETUP',
};
const SERVICO = { id: 'sv-1', slug: 'servico', name: 'Montagem', description: 'Montagem', price: 200, duration: 120, imageUrl: null };

const abrir = async (ui: ReactElement, path: string, entry: string, item: object, nome: string) => {
  apiFetch.mockResolvedValue(item);
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes><Route path={path} element={ui} /></Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
  await screen.findByRole('heading', { name: nome, level: 1 });
  const daPagina = seo.filter((p) => p.title === nome);
  return daPagina[daPagina.length - 1];
};

const PAGINAS = [
  ['equipamento', () => <EquipmentDetailPage />, '/equipamentos/:slug', '/equipamentos/caixa', CAIXA],
  ['kit', () => <KitDetailPage />, '/kits/:slug', '/kits/kit', KIT],
  ['serviço', () => <ServiceDetailPage />, '/servicos/:slug', '/servicos/servico', SERVICO],
] as const;

describe('Página do item inativo: abre pelo link, fora do Google', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seo.length = 0;
    useCart.mockReturnValue({ cart: null, addItem: vi.fn(), addService: vi.fn(), addKit: vi.fn(), itemCount: 0 });
  });

  it.each(PAGINAS)('%s INATIVO: a página abre e vai com noindex', async (_tipo, ui, path, entry, item) => {
    const props = await abrir(ui(), path, entry, { ...item, status: 'INACTIVE' }, item.name);
    expect(props?.noindex).toBe(true);
  });

  it.each(PAGINAS)('%s ativo, em manutenção ou em breve: indexado', async (_tipo, ui, path, entry, item) => {
    for (const status of ['ACTIVE', 'MAINTENANCE', 'COMING_SOON']) {
      seo.length = 0;
      const { unmount } = render(<></>);
      unmount();
      const props = await abrir(ui(), path, entry, { ...item, status }, item.name);
      expect(props?.noindex).toBe(false);
      document.body.innerHTML = '';
    }
  });
});
