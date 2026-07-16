// Caminho do arquivo: frontend/src/contexts/CartContext.tsx

import React, { useState, useEffect, createContext, useCallback, type ReactNode, useContext, useRef, useMemo } from 'react';
import ReactGA from 'react-ga4';
import { normalizeString } from '../utils/string';
import { apiFetch } from '../services/api';
import type { Booking } from '../types/types';
import type { Equipment, Kit, Service } from '../types/types';
import { useAuth } from './AuthContext';
import { NotificationContext } from './NotificationContext';
import { logger } from '../utils/logger';

type Cart = Booking & { services?: Service[] };

interface CartContextType {
  cart: Cart | null;
  itemCount: number;
  isLoading: boolean;
  isGuestCart: boolean;
  fetchCart: () => Promise<void>;
  addItem: (item: Equipment | Kit | Service, type: 'equipment' | 'kit' | 'service') => Promise<void>;
  removeItem: (itemId: string, type?: 'equipment' | 'service' | 'kit') => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export { CartContext };

// Achado (auditoria de produto): o carrinho exigia login em toda rota do backend
// (cartRoutes.ts:9), então um visitante anônimo que clicasse "Adicionar ao orçamento"
// era simplesmente redirecionado para /login e o item se perdia. Como "carrinho" no
// backend é literalmente um Booking rascunho preso a um creatorId obrigatório, criar um
// carrinho de convidado persistido ali exigiria mudar um relacionamento central do
// schema. Em vez disso, seguimos o padrão de mercado (Shopify/checkout de convidado):
// o carrinho do visitante vive só no navegador (localStorage) até o momento de enviar o
// orçamento — aí sim uma conta é criada automaticamente (ver QuoteRequestPage +
// POST /bookings/guest). Usuário autenticado continua com o carrinho real no backend,
// sem nenhuma mudança de comportamento.
const GUEST_CART_KEY = 'xp_guest_cart_v1';

const emptyGuestCart = (): Cart => ({
  id: 'guest-cart',
  equipments: [],
  services: [],
  kit: undefined,
  totalPrice: 0,
});

const readGuestCart = (): Cart => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return emptyGuestCart();
    const parsed = JSON.parse(raw) as Cart;
    return { ...emptyGuestCart(), ...parsed };
  } catch {
    return emptyGuestCart();
  }
};

const writeGuestCart = (cart: Cart) => {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
  } catch (e) {
    logger.warn('Não foi possível salvar o carrinho de convidado no localStorage', 'CartContext', e);
  }
};

const clearGuestCartStorage = () => {
  try {
    localStorage.removeItem(GUEST_CART_KEY);
  } catch {
    // localStorage indisponível (modo privado restrito, etc.) — nada a fazer.
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const fetchingRef = useRef(false);
  const lastFetchedAt = useRef<number | null>(null);
  const MIN_FETCH_INTERVAL_MS = 5000;
  const wasAuthenticated = useRef(isAuthenticated);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(readGuestCart());
      setIsLoading(false);
      return;
    }

    if (fetchingRef.current) return;
    if (lastFetchedAt.current && Date.now() - lastFetchedAt.current < MIN_FETCH_INTERVAL_MS) return;

    fetchingRef.current = true;
    setIsLoading(true);
    try {
      const cartData = await apiFetch('/cart');
      setCart(cartData as Cart);
      lastFetchedAt.current = Date.now();
    } catch (error) {
      logger.error('Erro ao buscar carrinho:', 'CartContext', error);
      setCart(null);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const notifCtx = useContext(NotificationContext);
  const notifCtxAddNotification = notifCtx?.addNotification;
  const addNotification = useCallback<NonNullable<typeof notifCtx>['addNotification']>(
    (...args) => notifCtxAddNotification?.(...args),
    [notifCtxAddNotification]
  );

  // Quando um convidado com itens no carrinho local faz login numa conta EXISTENTE
  // (não pelo checkout de convidado, que já autentica sozinho), replica os itens salvos
  // no carrinho real do backend antes de descartar o carrinho local — evita perder o que
  // a pessoa já tinha montado só porque decidiu logar no meio do caminho.
  useEffect(() => {
    const justAuthenticated = isAuthenticated && !wasAuthenticated.current;
    wasAuthenticated.current = isAuthenticated;
    if (!justAuthenticated) return;

    const guestCart = readGuestCart();
    const hasGuestItems = (guestCart.equipments?.length ?? 0) > 0 || (guestCart.services?.length ?? 0) > 0 || !!guestCart.kit;
    if (!hasGuestItems) return;

    (async () => {
      try {
        let merged: Cart | null = null;
        if (guestCart.kit?.id) {
          merged = await apiFetch('/cart/add-kit', { method: 'POST', body: JSON.stringify({ kitId: guestCart.kit.id }) }) as Cart;
        }
        for (const eq of (guestCart.equipments as Equipment[]) ?? []) {
          merged = await apiFetch('/cart/add', { method: 'POST', body: JSON.stringify({ equipmentId: eq.id }) }) as Cart;
        }
        for (const svc of guestCart.services ?? []) {
          merged = await apiFetch('/cart/add-service', { method: 'POST', body: JSON.stringify({ serviceId: svc.id }) }) as Cart;
        }
        clearGuestCartStorage();
        if (merged) {
          setCart(merged);
          addNotification({ type: 'success', title: 'Carrinho recuperado', message: 'Os itens que você tinha selecionado foram adicionados à sua conta.' });
        }
      } catch (e) {
        logger.error('Falha ao mesclar carrinho de convidado após login', 'CartContext', e);
      }
    })();
  }, [isAuthenticated, addNotification]);

  const addItem = useCallback(async (item: Equipment | Kit | Service, type: 'equipment' | 'kit' | 'service') => {
    // Deduplicação
    if (type === 'kit' && cart?.kit && cart.kit.id === (item as Kit).id) {
      addNotification({ type: 'warning', title: 'Kit já está no carrinho', message: 'Este kit já foi adicionado.' });
      return;
    }
    if (type === 'equipment' && cart?.equipments?.some((e) => ('equipmentId' in e ? e.equipmentId : e.id) === (item as Equipment).id)) {
      addNotification({ type: 'warning', title: 'Item já está no carrinho', message: 'Este equipamento já foi adicionado.' });
      return;
    }
    if (type === 'service' && cart?.services?.some((s) => s.id === (item as Service).id)) {
      addNotification({ type: 'warning', title: 'Serviço já está no carrinho', message: 'Este serviço já foi adicionado.' });
      return;
    }

    // Convidado: carrinho vive só no navegador, sem chamada de API nem exigência de login.
    if (!isAuthenticated) {
      const current = readGuestCart();
      let updated: Cart;
      if (type === 'kit') {
        updated = { ...current, kit: item as Kit };
      } else if (type === 'service') {
        updated = { ...current, services: [...(current.services ?? []), item as Service] };
      } else {
        updated = { ...current, equipments: [...(current.equipments as Equipment[] ?? []), item as Equipment] };
      }
      writeGuestCart(updated);
      setCart(updated);

      const label = 'name' in item ? item.name : '';
      const value = type === 'equipment' ? Number((item as Equipment).pricePerHour || 0) : Number((item as Kit | Service).price || 0);
      ReactGA.event({ category: 'ecommerce', action: 'add_to_cart', label, value });
      addNotification({ type: 'success', title: 'Adicionado', message: `${label || 'Item'} adicionado ao carrinho.` });
      return;
    }

    const previousCart = cart;
    try {
      if (type === 'kit') {
        const kitItem = item as Kit;
        const updatedCart = await apiFetch('/cart/add-kit', {
          method: 'POST',
          body: JSON.stringify({ kitId: kitItem.id }),
        });
        setCart(updatedCart as Cart);
        ReactGA.event({ category: "ecommerce", action: "add_to_cart", label: kitItem.name, value: Number(kitItem.price || 0) });
        addNotification({ type: 'success', title: 'Kit adicionado', message: 'Kit adicionado ao carrinho.' });
        return;
      }

      if (type === 'service') {
        const serviceItem = item as Service;
        const updatedCart = await apiFetch('/cart/add-service', {
          method: 'POST',
          body: JSON.stringify({ serviceId: serviceItem.id }),
        });
        setCart(updatedCart as Cart);
        ReactGA.event({ category: "ecommerce", action: "add_to_cart", label: serviceItem.name, value: Number(serviceItem.price || 0) });
        addNotification({ type: 'success', title: 'Serviço adicionado', message: 'Serviço adicionado ao carrinho.' });
        return;
      }

      // equipment
      const equipmentItem = item as Equipment;
      const updatedCart = await apiFetch('/cart/add', {
        method: 'POST',
        body: JSON.stringify({ equipmentId: item.id }),
      });
      setCart(updatedCart as Cart);
      ReactGA.event({ category: "ecommerce", action: "add_to_cart", label: equipmentItem.name, value: Number(equipmentItem.pricePerHour || 0) });
      addNotification({ type: 'success', title: 'Item adicionado', message: 'Item adicionado ao carrinho.' });
    } catch (e: unknown) {
      setCart(previousCart ?? null);
      const message = e instanceof Error ? e.message : 'Não foi possível adicionar o item ao carrinho.';
      if (message.includes('401') || normalizeString(message).includes('unauthorized')) {
        addNotification({ type: 'error', title: 'Sessão expirada', message: 'Faça login novamente para continuar.' });
        window.location.href = '/login';
        return;
      }
      addNotification({ type: 'error', title: 'Erro ao adicionar', message });
      throw new Error(message);
    }
  }, [cart, addNotification, isAuthenticated]);

  const removeItem = useCallback(async (itemId: string, type: 'equipment' | 'service' | 'kit' = 'equipment') => {
    if (!isAuthenticated) {
      const current = readGuestCart();
      let updated: Cart;
      if (type === 'kit') {
        updated = { ...current, kit: undefined };
      } else if (type === 'service') {
        updated = { ...current, services: (current.services ?? []).filter((s) => s.id !== itemId) };
      } else {
        updated = { ...current, equipments: ((current.equipments as Equipment[]) ?? []).filter((e) => e.id !== itemId) };
      }
      writeGuestCart(updated);
      setCart(updated);
      addNotification({ type: 'success', title: 'Removido', message: 'Item removido do carrinho.' });
      return;
    }

    const previousCart = cart;
    try {
      let updatedCart;
      if (type === 'service') {
        updatedCart = await apiFetch(`/cart/remove-service/${itemId}`, { method: 'DELETE' });
      } else if (type === 'kit') {
        updatedCart = await apiFetch(`/cart/remove-kit/${itemId}`, { method: 'DELETE' });
      } else {
        updatedCart = await apiFetch(`/cart/remove/${itemId}`, { method: 'DELETE' });
      }
      setCart(updatedCart as Cart);
      addNotification({ type: 'success', title: 'Removido', message: 'Item removido do carrinho.' });
    } catch (e: unknown) {
      setCart(previousCart ?? null);
      const message = e instanceof Error ? e.message : 'Não foi possível remover o item do carrinho.';
      addNotification({ type: 'error', title: 'Erro ao remover', message });
      throw new Error(message);
    }
  }, [cart, addNotification, isAuthenticated]);

  const clearCart = useCallback(async () => {
    if (!isAuthenticated) {
      clearGuestCartStorage();
      setCart(emptyGuestCart());
      addNotification({ type: 'success', title: 'Carrinho limpo', message: 'O carrinho foi limpo.' });
      return;
    }

    const previousCart = cart;
    try {
      setCart(null);
      const updatedCart = await apiFetch('/cart/clear', { method: 'POST' });
      setCart(updatedCart as Cart);
      addNotification({ type: 'success', title: 'Carrinho limpo', message: 'O carrinho foi limpo.' });
    } catch (e: unknown) {
      setCart(previousCart ?? null);
      const message = e instanceof Error ? e.message : 'Não foi possível limpar o carrinho.';
      addNotification({ type: 'error', title: 'Erro ao limpar', message });
      throw new Error(message);
    }
  }, [cart, addNotification, isAuthenticated]);

  const itemCount = useMemo(() =>
    (
      (cart?.equipments?.length || 0) +
      (cart?.kit ? 1 : 0) +
      (cart?.services?.length || 0)
    ) as number,
    [cart]
  );

  const value = useMemo(() => ({
    cart,
    itemCount,
    isLoading,
    isGuestCart: !isAuthenticated,
    fetchCart,
    addItem,
    removeItem,
    clearCart
  }), [cart, itemCount, isLoading, isAuthenticated, fetchCart, addItem, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const MemoizedCartProvider = React.memo(CartProvider);
