import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { post, useCart, useAuth, addNotification } = vi.hoisted(() => ({
  post: vi.fn(),
  useCart: vi.fn(),
  useAuth: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('../../../services/api', () => ({ api: { post } }));
vi.mock('../../../hooks/useCart', () => ({ useCart }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../components/ui/BrandLoader', () => ({
  BrandLoader: ({ label }: { label?: string }) => <div role="status">{label}</div>,
}));
vi.mock('../../../components/ui/TrustStrip', () => ({ TrustStrip: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { QuoteRequestPage } from '../QuoteRequestPage';

const EMPTY = { equipments: [], services: [] };
const WITH_ITEMS = { equipments: [{ id: 'eq1', name: 'Caixa de som', pricePerHour: 10 }], services: [] };
const EMPTY_TITLE = 'Seu carrinho está vazio';
const FORM_FIELD = 'Nome/Local do Evento *';

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/orcamento']}>
      <Routes>
        <Route path="/orcamento" element={<QuoteRequestPage />} />
        <Route path="/orcamento-sucesso/:id" element={<p>Tela de sucesso</p>} />
      </Routes>
    </MemoryRouter>,
  );

const setCart = (cart: unknown, isLoading = false) => useCart.mockReturnValue({ cart, isLoading, clearCart: vi.fn() });

describe('QuoteRequestPage: carrinho vazio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: null, setAuthenticatedUser: vi.fn(), isLoading: false });
  });

  it('sem itens: oferece o briefing e o catálogo em vez do formulário', () => {
    setCart(EMPTY);
    renderPage();
    expect(screen.getByRole('heading', { name: EMPTY_TITLE })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Conte como é o evento' })).toHaveAttribute('href', '/briefing');
    expect(screen.getByRole('link', { name: 'Ver Equipamentos' })).toHaveAttribute('href', '/equipamentos');
    expect(screen.queryByLabelText(FORM_FIELD)).toBeNull();
  });

  it('carrinho ainda carregando: não diz que está vazio nem mostra o formulário', () => {
    setCart(null, true);
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando seu carrinho');
    expect(screen.queryByRole('heading', { name: EMPTY_TITLE })).toBeNull();
    expect(screen.queryByLabelText(FORM_FIELD)).toBeNull();
  });

  it('login ainda em checagem: espera, porque o carrinho de quem tem conta só vem depois', () => {
    setCart(EMPTY);
    useAuth.mockReturnValue({ user: null, setAuthenticatedUser: vi.fn(), isLoading: true });
    renderPage();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: EMPTY_TITLE })).toBeNull();
  });

  it('com itens: mostra o formulário de sempre', () => {
    setCart(WITH_ITEMS);
    renderPage();
    expect(screen.getByLabelText(FORM_FIELD)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: EMPTY_TITLE })).toBeNull();
  });

  it('com itens, mesmo se o carrinho recarregar: o formulário não some enquanto a pessoa digita', () => {
    setCart(WITH_ITEMS, true);
    renderPage();
    expect(screen.getByLabelText(FORM_FIELD)).toBeInTheDocument();
  });

  it('depois do envio, o carrinho esvazia sem piscar a tela de vazio antes do sucesso', async () => {
    let releaseClear = () => {};
    let cleared = false;
    useCart.mockImplementation(() => {
      const [cart, setCartState] = useState<unknown>(WITH_ITEMS);
      return {
        cart,
        isLoading: false,
        clearCart: () => {
          cleared = true;
          setCartState(EMPTY);
          return new Promise<void>((resolve) => { releaseClear = resolve; });
        },
      };
    });
    post.mockResolvedValue({ data: { booking: { id: 'XP-1' } } });

    const { container } = renderPage();
    const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fill(FORM_FIELD, 'Espaço Kalahari');
    fill('Data do Evento *', '2030-03-20');
    // Auditoria do orçamento (12/11/2026): início e término do evento (O6), logística sem resposta pré-marcada (O25) e
    // WhatsApp obrigatório (O26).
    fill('Início do evento *', '19:00');
    fill('Término do evento *', '23:00');
    fill('CEP *', '30110-000');
    fill('Rua *', 'Av. Brasil');
    fill('Número *', '100');
    fill('Bairro *', 'Centro');
    fill('Cidade *', 'Belo Horizonte');
    fill('Estado *', 'MG');
    fill('Seu Nome *', 'Ana Souza');
    fill('Seu E-mail *', 'ana@cliente.test');
    fill('WhatsApp com DDD *', '(31) 98888-7777');
    for (const grupo of ['Local com escadas? *', 'Local coberto? *', 'Tem estacionamento? *']) {
      fireEvent.click(within(screen.getByRole('group', { name: grupo })).getByLabelText('Não sei'));
    }
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => expect(cleared).toBe(true));
    await waitFor(() => expect(screen.getByLabelText(FORM_FIELD)).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: EMPTY_TITLE })).toBeNull();

    releaseClear();
    await screen.findByText('Tela de sucesso');
    expect(screen.queryByRole('heading', { name: EMPTY_TITLE })).toBeNull();
  });
});
