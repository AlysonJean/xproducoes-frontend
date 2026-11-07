import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const { apiFetch, useCart } = vi.hoisted(() => ({ apiFetch: vi.fn(), useCart: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('../../hooks/useCart', () => ({ useCart }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../hooks/useRecommendations', () => ({ useRecommendations: () => ({ recommendations: [], loading: false }) }));
vi.mock('../../components/ui/RecommendationSection', () => ({ RecommendationSection: () => null }));
vi.mock('../../components/ui/FavoriteButton', () => ({ FavoriteButton: () => null }));
vi.mock('../../components/ui/CompareButton', () => ({ default: () => null }));
vi.mock('../../components/ui/AskOnWhatsAppButton', () => ({ AskOnWhatsAppButton: () => null }));
vi.mock('../../components/ui/ZoomableProductPhoto', () => ({ ZoomableProductPhoto: () => null }));
vi.mock('../../components/SEO', () => ({ SEO: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { EquipmentDetailPage } from '../EquipmentDetailPage';
import { EquipmentListPage } from '../EquipmentListPage';
import { KitDetailPage } from '../KitDetailPage';

// Lote 13, diária nas telas (decisão do dono de 06/11: o equipamento avulso passa a custar por diária, com a
// chave EQUIPMENT_PRICE_UNIT=day no servidor e os preços regravados como diária). O servidor já cobrava pela
// chave, mas as páginas públicas diziam "/ hora" fixo. A unidade vem com cada equipamento (priceUnit), então o
// preço já aparece com "/ diária", sem esperar GET /equipments/pricing-rules (sem "/ hora" piscando antes).
const CAIXA = {
  id: 'eq-caixa', slug: 'caixa-ativa', name: 'Caixa Ativa', description: 'Caixa ativa', pricePerHour: 720,
  minimumRentalDuration: 1, quantity: 2, status: 'ACTIVE', categoryId: 'cat-som', category: { id: 'cat-som', name: 'Som' }, tags: [],
};
const KIT = {
  id: 'kit-combo', slug: 'combo-festa', name: 'Combo Festa', description: 'Caixa e mesa', price: 149.99, imageUrl: '',
  experienceLevels: [],
  items: [{ id: 'i1', quantity: 1, equipmentId: 'eq-caixa', equipment: { ...CAIXA } }],
};

const comRotas = (ui: ReactElement, path = '/', entry = '/') => (
  <HelmetProvider>
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path={path} element={ui} />
      </Routes>
    </MemoryRouter>
  </HelmetProvider>
);

// Banco falso por endereço; a chave do servidor responde `chave` (quando a tela perguntar).
const servidor = (rotas: Record<string, unknown>, chave: 'hour' | 'day' = 'hour') => {
  apiFetch.mockImplementation((url: string) => {
    if (url === '/equipments/pricing-rules') return Promise.resolve({ equipmentPriceUnit: chave, kitPrice: 'PER_EVENT' });
    return url in rotas ? Promise.resolve(rotas[url]) : Promise.resolve([]);
  });
};
const perguntouAChave = () => apiFetch.mock.calls.some((c) => c[0] === '/equipments/pricing-rules');

describe('Diária nas páginas públicas de equipamento (lote 13)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCart.mockReturnValue({ cart: null, addItem: vi.fn() });
  });

  it('detalhe com priceUnit "day": o preço já aparece com "/ diária", sem perguntar a chave', async () => {
    servidor({ '/equipments/caixa-ativa': { ...CAIXA, priceUnit: 'day' } }, 'hour');
    render(comRotas(<EquipmentDetailPage />, '/equipamentos/:slug', '/equipamentos/caixa-ativa'));

    expect(await screen.findByText('/ diária')).toBeInTheDocument();
    expect(screen.queryByText('/ hora')).not.toBeInTheDocument();
    expect(perguntouAChave()).toBe(false);
  });

  it('detalhe com priceUnit "hour": o texto de hoje, "/ hora"', async () => {
    servidor({ '/equipments/caixa-ativa': { ...CAIXA, priceUnit: 'hour' } });
    render(comRotas(<EquipmentDetailPage />, '/equipamentos/:slug', '/equipamentos/caixa-ativa'));

    expect(await screen.findByText('/ hora')).toBeInTheDocument();
    expect(screen.queryByText('/ diária')).not.toBeInTheDocument();
  });

  it('detalhe vindo de uma API sem priceUnit: segue a chave do servidor ("day")', async () => {
    servidor({ '/equipments/caixa-ativa': CAIXA }, 'day');
    render(comRotas(<EquipmentDetailPage />, '/equipamentos/:slug', '/equipamentos/caixa-ativa'));

    expect(await screen.findByText('/ diária')).toBeInTheDocument();
    expect(perguntouAChave()).toBe(true);
  });

  it('HTML do servidor (SSR) do detalhe: só o carregando, sem preço nem "hora" para piscar', () => {
    servidor({ '/equipments/caixa-ativa': { ...CAIXA, priceUnit: 'day' } });
    const html = renderToString(comRotas(<EquipmentDetailPage />, '/equipamentos/:slug', '/equipamentos/caixa-ativa'));

    expect(html).toContain('Carregando equipamento');
    expect(html).not.toMatch(/hora|R\$/);
    expect(apiFetch).not.toHaveBeenCalled(); // no servidor nada é consultado
  });

  it('lista com priceUnit "day": cartões "/ diária" e o filtro "Preço da diária (R$)"', async () => {
    servidor({ '/equipments': [{ ...CAIXA, priceUnit: 'day' }], '/categories': [{ id: 'cat-som', name: 'Som' }] });
    render(comRotas(<EquipmentListPage />));

    expect(await screen.findByText('Preço da diária (R$)')).toBeInTheDocument();
    expect(screen.queryByText('Preço por hora (R$)')).not.toBeInTheDocument();
    expect(document.body.textContent).toContain('/ diária');
    expect(document.body.textContent).not.toMatch(/\/ hora/);
    expect(perguntouAChave()).toBe(false);
  });

  it('lista com priceUnit "hour": os textos de hoje', async () => {
    servidor({ '/equipments': [{ ...CAIXA, priceUnit: 'hour' }], '/categories': [{ id: 'cat-som', name: 'Som' }] });
    render(comRotas(<EquipmentListPage />));

    expect(await screen.findByText('Preço por hora (R$)')).toBeInTheDocument();
    expect(document.body.textContent).toContain('/ hora');
    expect(document.body.textContent).not.toContain('diária');
  });

  it('kit: o preço de cada equipamento do kit diz "/diária" (o bloco do preço do kit não é deste item)', async () => {
    servidor({ '/kits/combo-festa': { ...KIT, items: [{ ...KIT.items[0], equipment: { ...CAIXA, priceUnit: 'day' } }] } });
    render(comRotas(<KitDetailPage />, '/kits/:slug', '/kits/combo-festa'));

    await waitFor(() => expect(screen.getByText('Detalhes')).toBeInTheDocument());
    const precoDoItem = screen.getByText((_, el) => el?.tagName === 'SPAN' && /720,00\/diária$/.test(el.textContent ?? ''));
    expect(precoDoItem).toBeInTheDocument();
    expect(perguntouAChave()).toBe(false);
  });

  it('kit com o equipamento por hora: "/h", o texto de hoje', async () => {
    servidor({ '/kits/combo-festa': { ...KIT, items: [{ ...KIT.items[0], equipment: { ...CAIXA, priceUnit: 'hour' } }] } });
    render(comRotas(<KitDetailPage />, '/kits/:slug', '/kits/combo-festa'));

    await waitFor(() => expect(screen.getByText('Detalhes')).toBeInTheDocument());
    expect(screen.getByText((_, el) => el?.tagName === 'SPAN' && /720,00\/h$/.test(el.textContent ?? ''))).toBeInTheDocument();
  });
});
