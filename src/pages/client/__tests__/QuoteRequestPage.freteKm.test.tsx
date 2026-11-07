import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { formatPrice } from '../../../utils/formatPrice';

const { post, apiFetch, useCart, useAuth, addNotification } = vi.hoisted(() => ({
  post: vi.fn(),
  apiFetch: vi.fn(),
  useCart: vi.fn(),
  useAuth: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('../../../services/api', () => ({ api: { post }, apiFetch }));
vi.mock('@/services/api', () => ({ api: { post }, apiFetch }));
vi.mock('../../../hooks/useCart', () => ({ useCart }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../components/ui/BrandLoader', () => ({ BrandLoader: () => null }));
vi.mock('../../../components/ui/TrustStrip', () => ({ TrustStrip: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { QuoteRequestPage } from '../QuoteRequestPage';

// Frete por km (decisões do dono de 06/11/2026, item frete-km do lote 13). Não há rota pública de frete (cada
// cálculo gasta a cota do Google): o pedido de orçamento só mostra a regra, com os valores que o servidor usa
// (GET /equipments/pricing-rules), e o valor do frete vem na proposta. Pedido só com kit de retirada não tem
// frete. Antes a página não dizia nada sobre frete.
const REGRAS = { equipmentPriceUnit: 'hour', kitPrice: 'PER_EVENT', freight: { pricePerKm: 3.5, freeKm: 15, minimum: 50, roundTo: 10, trips: 2 } };
// A tela compara o texto com os espaços normalizados (o "R$" do formatPrice vem com espaço não separável).
const semNbsp = (texto: string) => texto.replace(/\s+/g, ' ');
const TEXTO = semNbsp(`Frete calculado pela distância: grátis até 15 km da X Produções; acima disso, ${formatPrice(3.5)} por km rodado. O valor aparece na proposta.`);
const CAIXA = { id: 'eq1', name: 'Caixa de som', pricePerHour: 10 };

const abrir = async (cart: object, regras: object = REGRAS) => {
  useCart.mockReturnValue({ cart, isLoading: false, clearCart: vi.fn() });
  apiFetch.mockImplementation((url: string) => (url === '/equipments/pricing-rules' ? Promise.resolve(regras) : Promise.resolve([])));
  render(
    <MemoryRouter initialEntries={['/orcamento']}>
      <Routes><Route path="/orcamento" element={<QuoteRequestPage />} /></Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/equipments/pricing-rules'));
  // As regras chegam do servidor depois da primeira pintura.
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
};

describe('QuoteRequestPage — a regra do frete no pedido de orçamento', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: null, setAuthenticatedUser: vi.fn(), isLoading: false });
  });

  it('com equipamento: o texto da regra, com os valores do servidor, numa consulta só às regras', async () => {
    await abrir({ equipments: [CAIXA], services: [] });

    expect(await screen.findByText(TEXTO)).toBeInTheDocument();
    expect(apiFetch.mock.calls.filter((c) => c[0] === '/equipments/pricing-rules')).toHaveLength(1);
    // O site não pede frete a nenhuma rota: o valor sai na proposta.
    expect(apiFetch.mock.calls.some((c) => String(c[0]).includes('freight'))).toBe(false);
    expect(post.mock.calls.some((c) => String(c[0]).includes('freight'))).toBe(false);
  });

  it('com kit de entrega e montagem: o texto aparece', async () => {
    await abrir({ kit: { id: 'kit-1', name: 'Kit Som', price: 500, fulfillment: 'DELIVERY_SETUP' }, equipments: [], services: [] });

    expect(await screen.findByText(TEXTO)).toBeInTheDocument();
  });

  it('só kit de retirada: sem frete, sem o texto', async () => {
    await abrir({ kit: { id: 'kit-1', name: 'Kit Festa', price: 500, fulfillment: 'CLIENT_PICKUP' }, equipments: [], services: [] });

    expect(screen.getByLabelText('CEP *')).toBeInTheDocument();
    expect(screen.queryByText(/Frete calculado pela distância/)).not.toBeInTheDocument();
  });

  it('regras com outros valores no servidor: o texto acompanha', async () => {
    await abrir({ equipments: [CAIXA], services: [] }, { ...REGRAS, freight: { ...REGRAS.freight, pricePerKm: 4, freeKm: 20 } });

    expect(await screen.findByText(new RegExp(`grátis até 20 km da X Produções; acima disso, ${semNbsp(formatPrice(4)).replace('$', '\\$')} por km rodado`))).toBeInTheDocument();
  });

  it('API sem as regras do frete (versão anterior): nenhum número que o servidor não confirmou', async () => {
    await abrir({ equipments: [CAIXA], services: [] }, { equipmentPriceUnit: 'hour', kitPrice: 'PER_EVENT' });

    await waitFor(() => expect(screen.queryByText(/Frete calculado pela distância/)).not.toBeInTheDocument());
    expect(screen.getByLabelText('CEP *')).toBeInTheDocument();
  });
});
