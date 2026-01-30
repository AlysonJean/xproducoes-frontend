// Caminho do arquivo: frontend/src/contexts/CartContext.tsx

import React, { useState, useEffect, createContext, useCallback, type ReactNode, useContext, useRef, useMemo } from 'react';
import ReactGA from 'react-ga4';
import { normalizeString } from '../utils/string';
import { apiFetch } from '../services/api';
import type { Booking } from '../types/types';
import type { Equipment, Kit } from '../types/types';
import { useAuth } from './AuthContext';
import { NotificationContext } from './NotificationContext';

type Cart = Booking;

interface CartContextType {
  cart: Cart | null;
  itemCount: number;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (item: Equipment | Kit, type: 'equipment' | 'kit') => Promise<void>;
  removeItem: (equipmentId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export { CartContext };

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  // evita chamadas muito frequentes ao backend
  const fetchingRef = useRef(false);
  const lastFetchedAt = useRef<number | null>(null);
  const MIN_FETCH_INTERVAL_MS = 5000; // 5s

  const fetchCart = useCallback(async () => {
    // Só tenta buscar o carrinho se o usuário estiver autenticado
    if (!isAuthenticated) {
      setCart(null);
      setIsLoading(false);
      return;
    }

    // Evita múltiplas chamadas simultâneas e polling muito frequente
    if (fetchingRef.current) return;
    if (lastFetchedAt.current && Date.now() - lastFetchedAt.current < MIN_FETCH_INTERVAL_MS) return;

    fetchingRef.current = true;
    setIsLoading(true);
    try {
  const cartData = await apiFetch('/cart');
      setCart(cartData as Booking);
      lastFetchedAt.current = Date.now();
    } catch (error) {
      console.error('Erro ao buscar carrinho:', error);
      // Em caso de erro, manter cart nulo
      setCart(null);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Prefer using NotificationContext directly here so CartProvider can be used even
  // if NotificationProvider isn't mounted above it in tests or storybooks.
  const notifCtx = useContext(NotificationContext);
  const addNotification = notifCtx?.addNotification ?? (() => {});

  const addItem = async (item: Equipment | Kit, type: 'equipment' | 'kit') => {
    // Deduplicação: não adicionar kit se já está no carrinho
    if (type === 'kit' && cart?.kit && cart.kit.id === (item as Kit).id) {
      addNotification({ type: 'warning', title: 'Kit já está no carrinho', message: 'Este kit já foi adicionado.' });
      return;
    }
    // Deduplicação: não adicionar equipamento se já está no carrinho
    if (type === 'equipment' && cart?.equipments?.some((e: any) => (e.equipmentId || e.id) === (item as Equipment).id)) {
      addNotification({ type: 'warning', title: 'Item já está no carrinho', message: 'Este equipamento já foi adicionado.' });
      return;
    }
    const previousCart = cart;
    try {
      setCart((prev) => prev); // força re-render
      if (type === 'kit') {
        const kitItem = item as Kit;
  const updatedCart = await apiFetch('/cart/add-kit', {
          method: 'POST',
          body: JSON.stringify({ kitId: kitItem.id }),
        });
        setCart(updatedCart as Booking);

        // GA Tracking
        ReactGA.event({
          category: "ecommerce",
          action: "add_to_cart",
          label: kitItem.name,
          value: Number(kitItem.price || 0)
        });

        addNotification({ type: 'success', title: 'Kit adicionado', message: 'Kit adicionado ao carrinho.' });
        return;
      }
      // equipment
      const equipmentItem = item as Equipment;
      const updatedCart = await apiFetch('/cart/add', {
        method: 'POST',
        body: JSON.stringify({ equipmentId: item.id }),
      });
      setCart(updatedCart as Booking);

      // GA Tracking
      ReactGA.event({
        category: "ecommerce",
        action: "add_to_cart",
        label: equipmentItem.name,
        value: Number(equipmentItem.pricePerHour || 0)
      });

      addNotification({ type: 'success', title: 'Item adicionado', message: 'Item adicionado ao carrinho.' });
    } catch (e: any) {
      setCart(previousCart ?? null);
      let message = e?.message || 'Não foi possível adicionar o item ao carrinho.';
  if (message.includes('401') || normalizeString(message).includes('unauthorized')) {
        addNotification({ type: 'error', title: 'Sessão expirada', message: 'Faça login para adicionar itens ao carrinho.' });
        window.location.href = '/login';
        return;
      }
      if (message.includes('404')) {
        addNotification({ type: 'error', title: 'Kit não encontrado', message: 'O kit não existe ou foi removido.' });
        return;
      }
      if (message.includes('409')) {
        addNotification({ type: 'warning', title: 'Kit já está no carrinho', message: 'Este kit já foi adicionado.' });
        return;
      }
      addNotification({ type: 'error', title: 'Erro ao adicionar', message });
      throw new Error(message);
    }
  };

  const removeItem = async (equipmentId: string) => {
    const previousCart = cart;
    try {
      // optimistic: remove locally first
      if (previousCart) {
        const clone = JSON.parse(JSON.stringify(previousCart)) as Booking;
        // normalize then filter
        const normalized = (clone.equipments || []).map((eq: any) =>
          eq && (eq as any).equipmentId ? eq : { equipmentId: (eq as Equipment).id, equipment: eq }
        );
        clone.equipments = normalized.filter((eq: any) => eq.equipmentId !== equipmentId);
        setCart(clone);
      }
      const updatedCart = await apiFetch(`/cart/remove/${equipmentId}`, { method: 'DELETE' });
      setCart(updatedCart as Booking);
      // Notify
  addNotification({ type: 'success', title: 'Removido', message: 'Item removido do carrinho.' });
    } catch (e: any) {
      console.error('CartContext.removeItem error', e);
      setCart(previousCart ?? null);
      const message = e?.message || 'Não foi possível remover o item do carrinho.';
  addNotification({ type: 'error', title: 'Erro ao remover', message });
      throw new Error(message);
    }
  };

  const clearCart = async () => {
    const previousCart = cart;
    try {
      // optimistic clear
      setCart(null);
  const updatedCart = await apiFetch('/cart/clear', { method: 'POST' });
      setCart(updatedCart as Booking);
      addNotification({ type: 'success', title: 'Carrinho limpo', message: 'O carrinho foi limpo.' });
    } catch (e: any) {
      console.error('CartContext.clearCart error', e);
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
      ((cart as any)?.items?.length || 0)
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

// Memoizar o provider para evitar re-renders desnecessários
export const MemoizedCartProvider = React.memo(CartProvider);
