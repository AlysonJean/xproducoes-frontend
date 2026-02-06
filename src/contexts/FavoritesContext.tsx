import { createContext, useContext, useEffect, useState } from 'react';

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

export const FavoritesProvider = ({ children }: { children: React.ReactNode }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    if (typeof window === 'undefined') return [];
    
    const savedFavorites = localStorage.getItem('xproducoes-favorites');
    if (savedFavorites) {
      try {
        const parsed = JSON.parse(savedFavorites);
        
        if (Array.isArray(parsed)) {
            const migratedStats: FavoriteItem[] = parsed.map(item => {
                if (typeof item === 'string' || typeof item === 'number') {
                    return { id: String(item), type: 'equipment' as FavoriteType };
                }
                return item as FavoriteItem;
            });
            const uniqueMap = new Map();
            migratedStats.forEach(item => uniqueMap.set(item.id, item));
            return Array.from(uniqueMap.values());
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  // Salvar favoritos no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('xproducoes-favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addToFavorites = (id: string | number, type: FavoriteType = 'equipment') => {
    const idStr = String(id);
    setFavorites((prev) => {
      if (!prev.some(f => f.id === idStr)) {
        return [...prev, { id: idStr, type }];
      }
      return prev;
    });
  };

  const removeFromFavorites = (id: string | number) => {
    const idStr = String(id);
    setFavorites((prev) => prev.filter((item) => item.id !== idStr));
  };

  const isFavorite = (id: string | number) => {
    return favorites.some(item => item.id === String(id));
  };

  // Toggle assumes if it's favorite, we remove it (regardless of type passed, though usually type should match)
  const toggleFavorite = (id: string | number, type: FavoriteType = 'equipment') => {
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

