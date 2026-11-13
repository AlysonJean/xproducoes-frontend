import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const { apiFetch, useCart, useCompare, addItem, addNotification, compareProps } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  useCart: vi.fn(),
  useCompare: vi.fn(),
  addItem: vi.fn(),
  addNotification: vi.fn(),
  compareProps: [] as Array<{ equipment: { status?: string } }>,
}));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('../../hooks/useCart', () => ({ useCart }));
vi.mock('../../contexts/CompareContext', () => ({ useCompare }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../components/ui/FavoriteButton', () => ({ FavoriteButton: () => null }));
vi.mock('../../components/ui/CompareButton', () => ({
  default: (props: { equipment: { status?: string } }) => {
    compareProps.push(props);
    return null;
  },
}));
vi.mock('../../components/SEO', () => ({ SEO: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { KitCard } from '../../components/ui/KitCard';
import { ComparePage } from '../ComparePage';
import type { Kit } from '../../types/types';

const KIT = { id: 'kit-03', slug: 'kit-03', name: 'Kit 03', description: 'Pista', price: 1190, imageUrl: '', items: [], status: 'ACTIVE' };

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

// Auditoria do orçamento (12/11/2026), O23/B6: o kit "em breve" ou em manutenção entrava no carrinho pelo "+" do cartão e
// pela comparação (só o serviço era barrado lá), e só voltava no envio do pedido. E o cartão dizia "Kit Adicionado" na
// hora, mesmo quando nada entrava (O24: agora o carrinho pergunta antes de trocar o kit e avisa o resultado).
describe('Item indisponível fora do carrinho: cartão do kit e comparação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    compareProps.length = 0;
    addItem.mockResolvedValue(true);
    apiFetch.mockResolvedValue(null);
    useCart.mockReturnValue({ cart: null, addItem, removeItem: vi.fn(), clearCart: vi.fn(), itemCount: 0 });
    useCompare.mockReturnValue({ items: [], removeItem: vi.fn(), clearCompare: vi.fn() });
  });

  it.each([
    ['COMING_SOON'],
    ['MAINTENANCE'],
    ['INACTIVE'],
  ])('cartão do kit %s: o "+" fica desligado e diz que está indisponível', (status) => {
    comRotas(<KitCard kit={{ ...KIT, status } as unknown as Kit} />);
    const botao = screen.getByRole('button', { name: 'Kit 03: indisponível no momento' });
    expect(botao).toBeDisabled();
    fireEvent.click(botao);
    expect(addItem).not.toHaveBeenCalled();
  });

  it('cartão do kit ativo: o "+" põe no carrinho, e o aviso fica com o carrinho (sem "Kit Adicionado" antes da hora)', async () => {
    comRotas(<KitCard kit={KIT as unknown as Kit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Kit 03 ao orçamento' }));
    await waitFor(() => expect(addItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'kit-03' }), 'kit'));
    expect(addNotification).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Kit Adicionado' }));
  });

  it('cartão do kit: a comparação recebe o status do kit', () => {
    comRotas(<KitCard kit={{ ...KIT, status: 'MAINTENANCE' } as unknown as Kit} />);
    expect(compareProps[compareProps.length - 1]?.equipment.status).toBe('MAINTENANCE');
  });

  it('comparação: kit e equipamento que não estão ativos ficam "Indisponível no momento"; o ativo vai ao carrinho sem aviso duplicado', async () => {
    useCompare.mockReturnValue({
      items: [
        { id: 'kit-03', name: 'Kit 03', price: 1190, type: 'kit', status: 'COMING_SOON' },
        { id: 'eq-mesa', name: 'Mesa de Som', price: 100, type: 'equipment', status: 'MAINTENANCE' },
        { id: 'kit-02', name: 'Kit 02', price: 650, type: 'kit', status: 'ACTIVE' },
      ],
      removeItem: vi.fn(),
      clearCompare: vi.fn(),
    });
    comRotas(<ComparePage />);

    const indisponiveis = screen.getAllByRole('button', { name: 'Indisponível no momento' });
    expect(indisponiveis).toHaveLength(2);
    indisponiveis.forEach((b) => expect(b).toBeDisabled());

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao orçamento' }));
    await waitFor(() => expect(addItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'kit-02' }), 'kit'));
    expect(addItem).toHaveBeenCalledTimes(1);
    expect(addNotification).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Adicionado' }));
  });
});
