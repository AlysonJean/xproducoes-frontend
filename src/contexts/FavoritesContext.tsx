// Provider + hook(s) co-localizados de propósito (padrão oficial de Context do React) —
// só afeta a granularidade do Fast Refresh em dev, sem efeito em produção/correção.
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from './AuthContext';
import { logger } from '../utils/logger';

export type FavoriteType = 'equipment' | 'kit' | 'service';

export interface FavoriteItem {
  id: string;
  type: FavoriteType;
}

interface FavoritesContextType {
  favorites: FavoriteItem[];
  addToFavorites: (id: string, type?: FavoriteType) => void;
  removeFromFavorites: (id: string) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string, type?: FavoriteType) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites deve ser usado dentro de um FavoritesProvider');
  }
  return context;
};

const STORAGE_KEY = 'xproducoes-favorites';

const readLocalFavorites = (): FavoriteItem[] => {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    const migrated: FavoriteItem[] = parsed.map((item) =>
      typeof item === 'string' || typeof item === 'number'
        ? { id: String(item), type: 'equipment' as FavoriteType }
        : (item as FavoriteItem)
    );
    const uniqueMap = new Map();
    migrated.forEach((item) => uniqueMap.set(item.id, item));
    return Array.from(uniqueMap.values());
  } catch {
    return [];
  }
};

const writeLocalFavorites = (favorites: FavoriteItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // localStorage indisponível — nada a fazer, degrada para "não persiste".
  }
};

interface RemoteFavoritesResponse {
  data?: {
    equipments?: Array<{ id: string }>;
    kits?: Array<{ id: string }>;
    services?: Array<{ id: string }>;
  };
}

const remoteResponseToItems = (resp: RemoteFavoritesResponse): FavoriteItem[] => {
  const data = resp?.data ?? {};
  return [
    ...(data.equipments ?? []).map((e) => ({ id: e.id, type: 'equipment' as FavoriteType })),
    ...(data.kits ?? []).map((k) => ({ id: k.id, type: 'kit' as FavoriteType })),
    ...(data.services ?? []).map((s) => ({ id: s.id, type: 'service' as FavoriteType })),
  ];
};

// Achado (auditoria de produto): GET /user/favorites era um stub sempre vazio — favoritos
// só existiam em localStorage, sem sincronizar entre dispositivos. Agora que o backend
// persiste de verdade (ClientFavorite), usuário autenticado usa o servidor como fonte da
// verdade; visitante anônimo continua com localStorage (mesmo padrão do carrinho de
// convidado). Ao logar com favoritos locais pendentes, eles são mesclados para a conta.
export const FavoritesProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => readLocalFavorites());
  const wasAuthenticated = useRef(isAuthenticated);

  // Usuário autenticado: servidor é a fonte da verdade.
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const resp = await apiFetch<RemoteFavoritesResponse>('/user/favorites');
        setFavorites(remoteResponseToItems(resp));
      } catch (e) {
        logger.error('Erro ao buscar favoritos', 'FavoritesContext', e);
      }
    })();
  }, [isAuthenticated]);

  // Visitante: persiste em localStorage a cada mudança.
  useEffect(() => {
    if (isAuthenticated) return;
    writeLocalFavorites(favorites);
  }, [favorites, isAuthenticated]);

  // Ao logar com favoritos já coletados como convidado, mescla para a conta antes de
  // descartar o armazenamento local — evita perder o que a pessoa já tinha marcado.
  useEffect(() => {
    const justAuthenticated = isAuthenticated && !wasAuthenticated.current;
    wasAuthenticated.current = isAuthenticated;
    if (!justAuthenticated) return;

    const guestFavorites = readLocalFavorites();
    if (guestFavorites.length === 0) return;

    (async () => {
      try {
        for (const item of guestFavorites) {
          await apiFetch('/user/favorites', {
            method: 'POST',
            body: JSON.stringify({ itemId: item.id, itemType: item.type }),
          });
        }
        localStorage.removeItem(STORAGE_KEY);
        const resp = await apiFetch<RemoteFavoritesResponse>('/user/favorites');
        setFavorites(remoteResponseToItems(resp));
      } catch (e) {
        logger.error('Erro ao mesclar favoritos de convidado após login', 'FavoritesContext', e);
      }
    })();
  }, [isAuthenticated]);

  const addToFavorites = (id: string, type: FavoriteType = 'equipment') => {
    setFavorites((prev) => (prev.some((f) => f.id === id) ? prev : [...prev, { id, type }]));
    if (isAuthenticated) {
      apiFetch('/user/favorites', { method: 'POST', body: JSON.stringify({ itemId: id, itemType: type }) })
        .catch((e) => logger.error('Erro ao adicionar favorito', 'FavoritesContext', e));
    }
  };

  const removeFromFavorites = (id: string) => {
    const existing = favorites.find((f) => f.id === id);
    setFavorites((prev) => prev.filter((item) => item.id !== id));
    if (isAuthenticated && existing) {
      apiFetch(`/user/favorites/${id}?itemType=${existing.type}`, { method: 'DELETE' })
        .catch((e) => logger.error('Erro ao remover favorito', 'FavoritesContext', e));
    }
  };

  const isFavorite = (id: string) => favorites.some((item) => item.id === id);

  const toggleFavorite = (id: string, type: FavoriteType = 'equipment') => {
    if (isFavorite(id)) {
      removeFromFavorites(id);
    } else {
      addToFavorites(id, type);
    }
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        addToFavorites,
        removeFromFavorites,
        isFavorite,
        toggleFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};
