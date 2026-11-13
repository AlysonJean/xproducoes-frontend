import { useEffect, useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

const { apiFetch, useAuth, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('../AuthContext', () => ({ useAuth }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { CartProvider } from '../CartContext';
import { NotificationContext } from '../NotificationContext';
import { useCart } from '../../hooks/useCart';
import type { Equipment, Kit, Service } from '../../types/types';

const GUEST_CART_KEY = 'xp_guest_cart_v1';
const salvo = () => JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '{}');
const naoEncontrado = () => Object.assign(new Error('Não encontrado.'), { status: 404 });

// O carrinho como o visitante guardou semanas atrás: preço, tipo e horas do kit antigos.
const CARRINHO_ANTIGO = {
  id: 'guest-cart',
  kit: { id: 'kit-1', name: 'Kit Festa', price: 900, fulfillment: 'CLIENT_PICKUP', minimumRentalDuration: 2, items: [] },
  equipments: [
    { id: 'eq-1', name: 'Caixa Ativa', pricePerHour: 50, status: 'ACTIVE' },
    { id: 'eq-velho', name: 'Mesa Antiga', pricePerHour: 30 },
  ],
  services: [{ id: 'sv-dj', name: 'DJ Profissional', price: 300 }],
  totalPrice: 0,
};

// O catálogo de hoje (GET /kits/:id etc.; o Decimal chega como texto).
const CATALOGO: Record<string, unknown> = {
  '/kits/kit-1': {
    id: 'kit-1', name: 'Kit Festa', price: '1200.00', fulfillment: 'DELIVERY_SETUP', minimumRentalDuration: 4, extraHourPrice: '50.00', status: 'ACTIVE',
    items: [{ id: 'ki-1', kitId: 'kit-1', serviceId: 'sv-tec', quantity: 1, service: { id: 'sv-tec', name: 'Técnico de Som' } }],
  },
  '/equipments/eq-1': { id: 'eq-1', name: 'Caixa Ativa', pricePerHour: '70.00', status: 'MAINTENANCE', minimumRentalDuration: 2 },
};

// O valor do contexto, guardado depois de cada pintura, para o teste chamar refreshCart/addItem.
const atual: { valor?: ReturnType<typeof useCart> } = {};
const api = () => atual.valor as ReturnType<typeof useCart>;
const Consumidor = () => {
  const valor = useCart();
  useEffect(() => {
    atual.valor = valor;
  });
  const [resultado, setResultado] = useState('');
  return (
    <div>
      <p data-testid="kit">{valor.cart?.kit?.name ?? 'sem kit'}</p>
      <button type="button" onClick={async () => setResultado(String(await valor.addItem({ id: 'kit-2', name: 'Kit Grande', price: 2000, status: 'ACTIVE', items: [] } as Kit, 'kit')))}>
        pôr o kit grande
      </button>
      <p data-testid="resultado">{resultado}</p>
    </div>
  );
};

const montar = async (autenticado = false) => {
  useAuth.mockReturnValue({ isAuthenticated: autenticado });
  render(
    <NotificationContext.Provider value={{ addNotification } as never}>
      <CartProvider>
        <Consumidor />
      </CartProvider>
    </NotificationContext.Provider>,
  );
  await waitFor(() => expect(atual.valor).toBeDefined());
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
};

// Auditoria do orçamento (12/11/2026). O19: o carrinho de visitante guarda no navegador a cópia inteira de cada item, sem
// atualizar: preço, tipo do kit e horas incluídas antigos no carrinho e no "Total estimado". O23: item indisponível
// entrava no carrinho. O24: o segundo kit trocava o primeiro calado.
describe('CartContext — carrinho relido do catálogo, só item ativo e troca de kit com confirmação', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    atual.valor = undefined;
    apiFetch.mockImplementation((url: string) => {
      if (url in CATALOGO) return Promise.resolve(CATALOGO[url]);
      if (url === '/equipments/eq-velho') return Promise.reject(naoEncontrado());
      if (url === '/services/sv-dj') return Promise.reject(new TypeError('Failed to fetch'));
      return Promise.resolve(null);
    });
  });

  it('O19: refreshCart troca as cópias pelas do catálogo (preço, tipo, horas, composição, status) e marca o que sumiu, com o nome', async () => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(CARRINHO_ANTIGO));
    await montar();

    await act(async () => { await api().refreshCart(); });

    const kit = api().cart?.kit as Kit;
    expect(kit).toMatchObject({ price: 1200, fulfillment: 'DELIVERY_SETUP', minimumRentalDuration: 4, extraHourPrice: 50, status: 'ACTIVE' });
    expect(kit.items[0]).toMatchObject({ serviceId: 'sv-tec' });
    const [caixa, mesa] = api().cart?.equipments as Array<Equipment & { catalogMissing?: boolean }>;
    expect(caixa).toMatchObject({ pricePerHour: '70.00', status: 'MAINTENANCE', minimumRentalDuration: 2 });
    expect(mesa).toMatchObject({ id: 'eq-velho', name: 'Mesa Antiga', catalogMissing: true });
    // Falha de rede: a cópia fica como estava, sem marca.
    expect((api().cart?.services as Service[])[0]).toEqual(CARRINHO_ANTIGO.services[0]);
    // E o navegador guarda a cópia nova.
    expect(salvo().kit.price).toBe(1200);
    expect(salvo().equipments[1].catalogMissing).toBe(true);
    expect(apiFetch).toHaveBeenCalledWith('/kits/kit-1');
    expect(apiFetch).toHaveBeenCalledWith('/equipments/eq-1');
  });

  it('O19: item que entrou durante a releitura não se perde', async () => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify({ ...CARRINHO_ANTIGO, kit: undefined, equipments: [CARRINHO_ANTIGO.equipments[0]], services: [] }));
    let liberar: (v: unknown) => void = () => undefined;
    apiFetch.mockImplementation((url: string) => (url === '/equipments/eq-1' ? new Promise((r) => { liberar = r; }) : Promise.resolve(null)));
    await montar();

    let releitura: Promise<void> = Promise.resolve();
    act(() => { releitura = api().refreshCart(); });
    await act(async () => { await api().addItem({ id: 'eq-2', name: 'Microfone', pricePerHour: 20, status: 'ACTIVE' } as Equipment, 'equipment'); });
    await act(async () => { liberar(CATALOGO['/equipments/eq-1']); await releitura; });

    expect((api().cart?.equipments as Equipment[]).map((e) => e.id)).toEqual(['eq-1', 'eq-2']);
    expect((api().cart?.equipments as Equipment[])[0].status).toBe('MAINTENANCE');
  });

  it('O19: carrinho vazio: a releitura não consulta nada nem grava no navegador', async () => {
    await montar();
    await act(async () => { await api().refreshCart(); });
    expect(apiFetch).not.toHaveBeenCalled();
    expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull();
  });

  it('O23: item que não está ativo não entra no carrinho, e o aviso diz o nome', async () => {
    await montar();

    let entrou: boolean | undefined;
    await act(async () => { entrou = await api().addItem({ id: 'kit-x', name: 'Kit Em Breve', status: 'COMING_SOON', items: [] } as Kit, 'kit'); });

    expect(entrou).toBe(false);
    expect(api().cart?.kit).toBeFalsy();
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', message: expect.stringContaining('Kit Em Breve') }));
    await act(async () => { entrou = await api().addItem({ id: 'eq-m', name: 'Caixa em Manutenção', status: 'MAINTENANCE' } as Equipment, 'equipment'); });
    expect(entrou).toBe(false);
    expect(api().cart?.equipments).toEqual([]);
  });

  it('O24: com um kit no carrinho, o segundo pergunta antes; "Manter o atual" não troca, "Trocar o kit" troca', async () => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify({ ...CARRINHO_ANTIGO, kit: { ...CARRINHO_ANTIGO.kit, status: 'ACTIVE' } }));
    await montar();
    expect(screen.getByTestId('kit')).toHaveTextContent('Kit Festa');

    fireEvent.click(screen.getByRole('button', { name: 'pôr o kit grande' }));
    expect(await screen.findByText('Seu carrinho já tem o kit “Kit Festa”. Trocar pelo kit “Kit Grande”?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Manter o atual' }));
    await waitFor(() => expect(screen.getByTestId('resultado')).toHaveTextContent('false'));
    expect(screen.getByTestId('kit')).toHaveTextContent('Kit Festa');
    expect(salvo().kit.id).toBe('kit-1');

    fireEvent.click(screen.getByRole('button', { name: 'pôr o kit grande' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Trocar o kit' }));
    await waitFor(() => expect(screen.getByTestId('resultado')).toHaveTextContent('true'));
    expect(screen.getByTestId('kit')).toHaveTextContent('Kit Grande');
    expect(salvo().kit.id).toBe('kit-2');
  });

  it('O24, com conta: a pergunta vem antes de chamar o servidor; mantendo o kit, nada é enviado', async () => {
    apiFetch.mockImplementation((url: string) =>
      Promise.resolve(url === '/cart' ? { id: 'c1', kit: { id: 'kit-1', name: 'Kit Festa', status: 'ACTIVE' }, equipments: [], services: [] } : null));
    await montar(true);
    await waitFor(() => expect(screen.getByTestId('kit')).toHaveTextContent('Kit Festa'));

    fireEvent.click(screen.getByRole('button', { name: 'pôr o kit grande' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Manter o atual' }));
    await waitFor(() => expect(screen.getByTestId('resultado')).toHaveTextContent('false'));
    expect(apiFetch.mock.calls.some((c) => c[0] === '/cart/add-kit')).toBe(false);
  });

  // Login de quem montou o carrinho como visitante: cada item vai para o carrinho da conta.
  const CARRINHO_DO_VISITANTE = {
    id: 'guest-cart',
    equipments: [
      { id: 'eq-1', name: 'Caixa Ativa', pricePerHour: 50, status: 'ACTIVE' },
      { id: 'eq-2', name: 'Mesa de Som', pricePerHour: 30, status: 'ACTIVE' },
    ],
    services: [],
    totalPrice: 0,
  };
  const arvore = () => (
    <NotificationContext.Provider value={{ addNotification } as never}>
      <CartProvider>
        <Consumidor />
      </CartProvider>
    </NotificationContext.Provider>
  );
  const entrarNaConta = async () => {
    useAuth.mockReturnValue({ isAuthenticated: false });
    const tela = render(arvore());
    await waitFor(() => expect(atual.valor).toBeDefined());
    useAuth.mockReturnValue({ isAuthenticated: true });
    tela.rerender(arvore());
  };

  it('login: o item que o carrinho da conta recusa (400) fica de fora, com o nome no aviso; os outros entram', async () => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(CARRINHO_DO_VISITANTE));
    const recusado = () => Object.assign(new Error('O equipamento "Caixa Ativa" não está disponível no momento e não entrou no carrinho.'), { status: 400 });
    apiFetch.mockImplementation((url: string, options?: { body?: string }) => {
      if (url === '/cart/add') {
        return JSON.parse(options?.body ?? '{}').equipmentId === 'eq-1'
          ? Promise.reject(recusado())
          : Promise.resolve({ id: 'c1', equipments: [CARRINHO_DO_VISITANTE.equipments[1]], services: [] });
      }
      return Promise.resolve(url === '/cart' ? { id: 'c1', equipments: [], services: [] } : null);
    });

    await entrarNaConta();

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ title: 'Itens indisponíveis', message: expect.stringContaining('Caixa Ativa') })));
    expect(apiFetch.mock.calls.filter((c) => c[0] === '/cart/add')).toHaveLength(2);
    expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull();
  });

  it('login com a rede fora: nada vira "indisponível" e o carrinho do navegador fica guardado', async () => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(CARRINHO_DO_VISITANTE));
    apiFetch.mockImplementation((url: string) => {
      if (url === '/cart/add') return Promise.reject(new TypeError('Failed to fetch'));
      return Promise.resolve(url === '/cart' ? { id: 'c1', equipments: [], services: [] } : null);
    });

    await entrarNaConta();

    await waitFor(() => expect(apiFetch.mock.calls.some((c) => c[0] === '/cart/add')).toBe(true));
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(addNotification).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Itens indisponíveis' }));
    expect(JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '{}').equipments).toHaveLength(2);
  });

  it('com conta: refreshCart busca o carrinho do servidor (force ignora o intervalo mínimo)', async () => {
    apiFetch.mockImplementation((url: string) => Promise.resolve(url === '/cart' ? { id: 'c1', equipments: [], services: [] } : null));
    await montar(true);
    const antes = apiFetch.mock.calls.filter((c) => c[0] === '/cart').length;

    await act(async () => { await api().refreshCart({ force: true }); });

    expect(apiFetch.mock.calls.filter((c) => c[0] === '/cart').length).toBe(antes + 1);
  });
});
