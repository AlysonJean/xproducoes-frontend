// Caminho do arquivo: frontend/src/contexts/CartContext.tsx

import React, { useState, useEffect, createContext, useCallback, type ReactNode, useContext, useRef, useMemo } from 'react';
import ReactGA from 'react-ga4';
import { normalizeString } from '../utils/string';
import { apiFetch } from '../services/api';
import type { Booking } from '../types/types';
import type { Equipment, Kit, Service } from '../types/types';
import { useAuth } from './AuthContext';
import { NotificationContext } from './NotificationContext';

type Cart = Booking & { services?: Service[] };

interface CartContextType {
  cart: Cart | null;
  itemCount: number;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (item: Equipment | Kit | Service, type: 'equipment' | 'kit' | 'service') => Promise<void>;
  removeItem: (itemId: string, type?: 'equipment' | 'service') => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export { CartContext };

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const fetchingRef = useRef(false);
  const lastFetchedAt = useRef<number | null>(null);
  const MIN_FETCH_INTERVAL_MS = 5000;

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
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
      console.error('Erro ao buscar carrinho:', error);
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
  const addNotification = notifCtx?.addNotification ?? (() => {});

  const addItem = async (item: Equipment | Kit | Service, type: 'equipment' | 'kit' | 'service') => {
    // Deduplicação
    if (type === 'kit' && cart?.kit && cart.kit.id === (item as Kit).id) {
      addNotification({ type: 'warning', title: 'Kit já está no carrinho', message: 'Este kit já foi adicionado.' });
      return;
    }
    if (type === 'equipment' && cart?.equipments?.some((e: any) => (e.equipmentId || e.id) === (item as Equipment).id)) {
      addNotification({ type: 'warning', title: 'Item já está no carrinho', message: 'Este equipamento já foi adicionado.' });
      return;
    }
    if (type === 'service' && cart?.services?.some((s: any) => s.id === (item as Service).id)) {
      addNotification({ type: 'warning', title: 'Serviço já está no carrinho', message: 'Este serviço já foi adicionado.' });
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
    } catch (e: any) {
      setCart(previousCart ?? null);
      let message = e?.message || 'Não foi possível adicionar o item ao carrinho.';
      if (message.includes('401') || normalizeString(message).includes('unauthorized')) {
        addNotification({ type: 'error', title: 'Sessão expirada', message: 'Faça login para adicionar itens ao carrinho.' });
        window.location.href = '/login';
        return;
      }
      addNotification({ type: 'error', title: 'Erro ao adicionar', message });
      throw new Error(message);
    }
  };

  const removeItem = async (itemId: string, type: 'equipment' | 'service' = 'equipment') => {
    const previousCart = cart;
    try {
      let updatedCart;
      if (type === 'service') {
        updatedCart = await apiFetch(`/cart/remove-service/${itemId}`, { method: 'DELETE' });
      } else {
        updatedCart = await apiFetch(`/cart/remove/${itemId}`, { method: 'DELETE' });
      }
      setCart(updatedCart as Cart);
      addNotification({ type: 'success', title: 'Removido', message: 'Item removido do carrinho.' });
    } catch (e: any) {
      setCart(previousCart ?? null);
      const message = e?.message || 'Não foi possível remover o item do carrinho.';
      addNotification({ type: 'error', title: 'Erro ao remover', message });
      throw new Error(message);
    }
  };

  const clearCart = async () => {
    const previousCart = cart;
    try {
      setCart(null);
      const updatedCart = await apiFetch('/cart/clear', { method: 'POST' });
      setCart(updatedCart as Cart);
      addNotification({ type: 'success', title: 'Carrinho limpo', message: 'O carrinho foi limpo.' });
    } catch (e: any) {
      setCart(previousCart ?? null);
      const message = e?.message || 'Não foi possível limpar o carrinho.';
      addNotification({ type: 'error', title: 'Erro ao limpar', message });
      throw new Error(message);
    }
  };

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
    fetchCart,
    addItem,
    removeItem,
    clearCart
  }), [cart, itemCount, isLoading, fetchCart, addItem, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const MemoizedCartProvider = React.memo(CartProvider);
