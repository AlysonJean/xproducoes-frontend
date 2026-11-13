import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const { apiFetch, useCart, addNotification, refreshCart } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  useCart: vi.fn(),
  addNotification: vi.fn(),
  refreshCart: vi.fn(),
}));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../../hooks/useCart', () => ({ useCart }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../hooks/useRecommendations', () => ({ useRecommendations: () => ({ recommendations: [], loading: false }) }));
vi.mock('../../../components/ui/RecommendationSection', () => ({ RecommendationSection: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { CartPage } from '../CartPage';
import { freightRulesText, parseFreightRules } from '../../../utils/freightInfo';

const FRETE = { pricePerKm: 3.5, freeKm: 15, minimum: 50, roundTo: 10, trips: 4 };
const TECNICO = { id: 'sv-tec', name: 'Técnico de Som e Operação Profissional', price: 300, duration: 180, coversWholeEvent: true, status: 'ACTIVE' };
const DJ = { id: 'sv-dj', name: 'DJ Profissional', price: 300, duration: 240, coversWholeEvent: false, status: 'ACTIVE' };
const ROADIE = { id: 'sv-roadie', name: 'Roadie / Auxiliar de Montagem', price: 100, duration: 180, status: 'ACTIVE' };
const semNbsp = (texto: string) => texto.replace(/\s+/g, ' ');

const abrir = async (cart: Record<string, unknown>, regras: Record<string, unknown> = { equipmentPriceUnit: 'day', kitPrice: 'PER_EVENT', freight: FRETE }) => {
  useCart.mockReturnValue({ cart: { equipments: [], services: [], ...cart }, addItem: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn(), itemCount: 1, refreshCart });
  apiFetch.mockImplementation((url: string) => Promise.resolve(url === '/equipments/pricing-rules' ? regras : null));
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/carrinho']}>
        <Routes>
          <Route path="/carrinho" element={<CartPage />} />
          <Route path="/orcamento" element={<p>Tela do orçamento</p>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
};

const subtotal = () => semNbsp(screen.getByText('Subtotal parcial').parentElement?.textContent ?? '');
const aviso = () => semNbsp(screen.getByText(/Este valor é uma estimativa parcial/).textContent ?? '');

// Auditoria do orçamento (12/11/2026). O5/A8: o técnico que acompanha o evento todo aparecia com preço fixo ("/ serviço"),
// e o aviso dizia "os serviços possuem valor fixo"; o servidor cobra pelas horas. O subtotal do equipamento na diária
// ignorava o mínimo de diárias. O texto do transporte ("taxas validadas pela equipe") não dizia que o frete é calculado
// pela distância e aparece na proposta. O19/O23: item indisponível aparecia como qualquer outro. E1: serviço que o kit já
// traz contava de novo.
describe('CartPage — como cada item é cobrado, frete e item indisponível', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshCart.mockResolvedValue(undefined);
  });

  it('ao abrir, pede a releitura do carrinho (O19)', async () => {
    await abrir({ services: [DJ] });
    expect(refreshCart).toHaveBeenCalled();
  });

  it('O5: o técnico do evento todo mostra a regra (até 3 h de evento, hora a mais proporcional), não "/ serviço"; o DJ segue "/ serviço"', async () => {
    await abrir({ services: [TECNICO, DJ] });
    expect(screen.getByText('até 3 h de evento')).toBeInTheDocument();
    expect(screen.getByText('Acompanha o evento todo: cada hora a mais sai proporcional, pelas horas do seu evento.')).toBeInTheDocument();
    expect(screen.getAllByText('/ serviço')).toHaveLength(1);
    expect(aviso()).not.toMatch(/valor fixo/);
  });

  it('O5: na diária, o subtotal do equipamento respeita o mínimo de diárias', async () => {
    await abrir({ equipments: [{ id: 'eq-caixa', name: 'Caixa Ativa', pricePerHour: 720, minimumRentalDuration: 3, status: 'ACTIVE' }] });
    expect(screen.getByText('/ diária')).toBeInTheDocument();
    expect(semNbsp(screen.getByText(/Mínimo de 3 diárias/).textContent ?? '')).toBe('Mínimo de 3 diárias: R$ 2.160,00');
    expect(subtotal()).toMatch(/R\$ 2\.160,00/);
  });

  it('O5: por hora, o mínimo do cadastro não entra (1 unidade, como hoje)', async () => {
    await abrir({ equipments: [{ id: 'eq-caixa', name: 'Caixa Ativa', pricePerHour: 720, minimumRentalDuration: 3, status: 'ACTIVE' }] }, { equipmentPriceUnit: 'hour', kitPrice: 'PER_EVENT', freight: FRETE });
    expect(screen.queryByText(/Mínimo de/)).not.toBeInTheDocument();
    expect(subtotal()).toMatch(/R\$ 720,00/);
  });

  it('frete: o texto da regra do servidor (freightRulesText), no lugar de "taxas validadas pela equipe"', async () => {
    await abrir({ equipments: [{ id: 'eq-caixa', name: 'Caixa Ativa', pricePerHour: 720, status: 'ACTIVE' }] });
    expect(aviso()).toContain(semNbsp(freightRulesText(parseFreightRules(FRETE)!)));
    expect(aviso()).not.toMatch(/validadas por nossa equipe/);
  });

  it('frete: sem as regras na resposta, diz que é calculado pela distância e aparece na proposta', async () => {
    await abrir({ equipments: [{ id: 'eq-caixa', name: 'Caixa Ativa', pricePerHour: 720, status: 'ACTIVE' }] }, { equipmentPriceUnit: 'day' });
    expect(aviso()).toContain('O frete é calculado pela distância até o local e aparece na proposta.');
  });

  it('frete: só serviços (sem entrega), nenhuma frase de frete', async () => {
    await abrir({ services: [DJ] });
    expect(aviso()).not.toMatch(/frete/i);
  });

  it('O19/O23: item indisponível ou que sumiu aparece marcado, com o nome, fora do subtotal; "Seguir" avisa e não sai', async () => {
    await abrir({
      kit: { id: 'kit-1', name: 'Kit Festa', price: 1200, status: 'COMING_SOON', items: [] },
      equipments: [
        { id: 'eq-velho', name: 'Mesa Antiga', pricePerHour: 30, catalogMissing: true },
        { id: 'eq-caixa', name: 'Caixa Ativa', pricePerHour: 720, status: 'ACTIVE' },
      ],
    });
    expect(screen.getAllByText('Indisponível no momento')).toHaveLength(2);
    expect(screen.getByRole('alert')).toHaveTextContent('Estes itens não estão disponíveis agora: Mesa Antiga, Kit Festa.');
    expect(subtotal()).toMatch(/R\$ 720,00/);

    fireEvent.click(screen.getByRole('button', { name: 'Seguir para Orçamento' }));
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', message: 'Tire do carrinho para seguir: Mesa Antiga, Kit Festa.' }));
    expect(screen.queryByText('Tela do orçamento')).not.toBeInTheDocument();
  });

  it('E1: o serviço que o kit do carrinho já traz aparece "Incluso no kit" e não soma', async () => {
    await abrir({ kit: { id: 'kit-02', name: 'Kit 02', price: 650, status: 'ACTIVE', items: [{ serviceId: 'sv-roadie' }] }, services: [ROADIE] });
    expect(screen.getByText('Incluso no kit')).toBeInTheDocument();
    expect(screen.getByText('Já vem no kit do carrinho: não é cobrado de novo.')).toBeInTheDocument();
    expect(subtotal()).toMatch(/R\$ 650,00/);
  });
});
