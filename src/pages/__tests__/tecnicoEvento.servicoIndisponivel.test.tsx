import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const { apiFetch, useCart, useCompare, addItem } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  useCart: vi.fn(),
  useCompare: vi.fn(),
  addItem: vi.fn(),
}));
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

import { ServiceDetailPage } from '../ServiceDetailPage';
import { ComparePage } from '../ComparePage';

// Lote 13, técnico durante o evento (revisão): o pedido de cliente ou convidado passou a aceitar só serviço ATIVO
// (inativo, em manutenção ou "em breve" = 400 com a mensagem para tirá-lo do carrinho). O cartão do serviço já não
// deixava pôr no carrinho o que não está ativo, mas a página do serviço só bloqueava "em manutenção" e a comparação
// não bloqueava nada: o visitante punha um serviço "em breve" no carrinho e o pedido voltava 400. Agora os três
// lugares seguem a mesma regra; perguntar pelo WhatsApp continua na página do serviço.
const TECNICO = {
  id: 'sv-tec',
  slug: 'tecnico-de-som',
  name: 'Técnico de Som e Operação Profissional',
  description: 'Som do começo ao fim do evento',
  price: '300.00',
  duration: 180,
  coversWholeEvent: true,
  imageUrl: '',
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

const abrirServico = (status: string) => {
  apiFetch.mockImplementation((url: string) =>
    Promise.resolve(url === '/services/tecnico-de-som' ? { ...TECNICO, status, prevSlug: null, nextSlug: null } : null),
  );
  comRotas(<ServiceDetailPage />, '/servicos/:slug', '/servicos/tecnico-de-som');
};

describe('Serviço que não está ativo não vai ao carrinho (o pedido o recusaria)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addItem.mockResolvedValue(undefined);
    useCart.mockReturnValue({ cart: null, addItem, removeItem: vi.fn(), clearCart: vi.fn(), itemCount: 0 });
    useCompare.mockReturnValue({ items: [], removeItem: vi.fn(), clearCompare: vi.fn() });
  });

  it('página do serviço ativo: o botão põe no orçamento, como antes', async () => {
    abrirServico('ACTIVE');

    const botao = await screen.findByRole('button', { name: 'Adicionar ao orçamento' });
    expect(botao).toBeEnabled();
    expect(screen.getByText('Disponível')).toBeInTheDocument();
    fireEvent.click(botao);
    await waitFor(() => expect(addItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'sv-tec' }), 'service'));
  });

  it.each([
    ['COMING_SOON', 'Em Breve'],
    ['MAINTENANCE', 'Em Manutenção'],
    ['INACTIVE', 'Indisponível'],
  ])('página do serviço %s: selo "%s" e o botão desligado, sem pôr no carrinho', async (status, selo) => {
    abrirServico(status);

    const botao = await screen.findByRole('button', { name: 'Indisponível no momento' });
    expect(botao).toBeDisabled();
    fireEvent.click(botao);
    expect(addItem).not.toHaveBeenCalled();
    expect(screen.getByText(selo)).toBeInTheDocument();
    // Antes o serviço inativo aparecia como "Disponível".
    expect(screen.queryByText('Disponível')).not.toBeInTheDocument();
  });

  it('comparação: o serviço "em breve" fica sem o botão de pôr no orçamento; o serviço ativo e o equipamento seguem como antes', () => {
    apiFetch.mockResolvedValue(null);
    useCompare.mockReturnValue({
      items: [
        { id: 'sv-luz', name: 'Técnico de Iluminação', price: 250, type: 'service', status: 'COMING_SOON' },
        { id: 'sv-tec', name: 'Técnico de Som e Operação Profissional', price: 300, type: 'service', status: 'ACTIVE' },
        { id: 'eq-caixa', name: 'Caixa Ativa', price: 100, type: 'equipment' },
      ],
      removeItem: vi.fn(),
      clearCompare: vi.fn(),
    });
    comRotas(<ComparePage />);

    const indisponivel = screen.getByRole('button', { name: 'Indisponível no momento' });
    expect(indisponivel).toBeDisabled();
    fireEvent.click(indisponivel);
    expect(addItem).not.toHaveBeenCalled();

    const disponiveis = screen.getAllByRole('button', { name: 'Adicionar ao orçamento' });
    expect(disponiveis).toHaveLength(2);
    fireEvent.click(disponiveis[0]);
    expect(addItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'sv-tec' }), 'service');
  });
});
