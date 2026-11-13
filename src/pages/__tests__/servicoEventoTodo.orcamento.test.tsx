import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const { apiFetch, useCart } = vi.hoisted(() => ({ apiFetch: vi.fn(), useCart: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('../../hooks/useCart', () => ({ useCart }));
vi.mock('@/hooks/useCart', () => ({ useCart }));
vi.mock('../../contexts/CompareContext', () => ({ useCompare: () => ({ items: [], addItem: vi.fn(), removeItem: vi.fn() }) }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../hooks/useRecommendations', () => ({ useRecommendations: () => ({ recommendations: [], loading: false }) }));
vi.mock('../../components/ui/RecommendationSection', () => ({ RecommendationSection: () => null }));
vi.mock('../../components/ui/FavoriteButton', () => ({ FavoriteButton: () => null }));
vi.mock('../../components/ui/CompareButton', () => ({ default: () => null }));
vi.mock('../../components/ui/AskOnWhatsAppButton', () => ({ AskOnWhatsAppButton: () => null }));
vi.mock('../../components/ui/ZoomableProductPhoto', () => ({ ZoomableProductPhoto: () => null }));
vi.mock('../../components/ui/OptimizedImage', () => ({ OptimizedImage: () => null }));
vi.mock('../../components/SEO', () => ({ SEO: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { ServiceDetailPage } from '../ServiceDetailPage';
import { ServiceCard } from '../../components/ui/ServiceCard';
import type { Service } from '../../types/types';

// O mesmo técnico do catálogo (decisão da dona de 06/11): R$ 300 por 180 min; evento de 6 h = R$ 600.
const TECNICO = {
  id: 'sv-tec', slug: 'tecnico-de-som', name: 'Técnico de Som e Operação Profissional', description: 'Som do começo ao fim',
  price: '300.00', duration: 180, coversWholeEvent: true, imageUrl: '', status: 'ACTIVE',
};
const DJ = { ...TECNICO, id: 'sv-dj', slug: 'dj', name: 'DJ Profissional', price: '500.00', duration: 240, coversWholeEvent: false };

const normalizado = (texto: string | null | undefined) => (texto ?? '').replace(/\s+/g, ' ');

const abrirServico = (servico: object) => {
  apiFetch.mockImplementation((url: string) =>
    Promise.resolve(url.startsWith('/services/') ? { ...servico, prevSlug: null, nextSlug: null } : null),
  );
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/servicos/x']}>
        <Routes><Route path="/servicos/:slug" element={<ServiceDetailPage />} /></Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
};

// Auditoria do orçamento (12/11/2026), O5, E6 e B2: o Técnico de Som (acompanha o evento todo) aparecia com preço fixo
// ("/ serviço") na página do serviço e "a partir de" no cartão, e o servidor cobra pelas horas do evento (serviceLine).
// Agora os dois dizem a regra proporcional; os serviços de preço fixo (DJ e os demais) continuam como estavam.
describe('Serviço que acompanha o evento todo mostra a regra proporcional (O5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCart.mockReturnValue({ cart: null, addItem: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn(), itemCount: 0 });
  });

  it('página do Técnico de Som: as horas cobertas e a hora a mais proporcional, sem "/ serviço"', async () => {
    abrirServico(TECNICO);

    const regra = await screen.findByText(/Acompanha o evento todo/);
    expect(normalizado(regra.textContent)).toContain('R$ 300,00 até 3 h de evento; cada hora a mais sai proporcional.');
    expect(screen.getByText('/ até 3 h de evento')).toBeInTheDocument();
    expect(screen.queryByText('/ serviço')).not.toBeInTheDocument();
  });

  it('página do DJ (preço fixo): "/ serviço", sem a regra proporcional', async () => {
    abrirServico(DJ);

    expect(await screen.findByText('/ serviço')).toBeInTheDocument();
    expect(screen.queryByText(/Acompanha o evento todo/)).not.toBeInTheDocument();
  });

  it('cartão do Técnico de Som: as horas cobertas e a hora a mais proporcional', () => {
    render(<MemoryRouter><ServiceCard service={{ ...TECNICO, price: 300 } as unknown as Service} /></MemoryRouter>);

    expect(screen.getByText('até 3 h de evento; hora a mais proporcional')).toBeInTheDocument();
    expect(screen.queryByText('a partir de')).not.toBeInTheDocument();
  });

  it('cartão do DJ: como antes', () => {
    render(<MemoryRouter><ServiceCard service={{ ...DJ, price: 500 } as unknown as Service} /></MemoryRouter>);

    expect(screen.getByText('a partir de')).toBeInTheDocument();
    expect(screen.queryByText(/hora a mais proporcional/)).not.toBeInTheDocument();
  });
});
