import { createContext, useContext, useEffect, useState } from 'react';

interface FavoritesContextType {
  favorites: string[];
  addToFavorites: (equipmentId: string) => void;
  removeFromFavorites: (equipmentId: string) => void;
  isFavorite: (equipmentId: string) => boolean;
  toggleFavorite: (equipmentId: string) => void;
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
  const [favorites, setFavorites] = useState<string[]>([]);

  // Carregar favoritos do localStorage na inicialização
  useEffect(() => {
  const savedFavorites = localStorage.getItem('xproducoes-favorites');
    if (savedFavorites) {
      try {
    // Normalize loaded ids to strings
    const parsed = JSON.parse(savedFavorites) as Array<string | number>;
    setFavorites(parsed.map((id) => String(id)));
      } catch {
        // TODO: Integrar sistema de notificação de erro para o usuário
        // Exemplo: notification.error('Erro ao carregar favoritos');
      }
    }
  }, []);

  // Salvar favoritos no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('xproducoes-favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addToFavorites = (equipmentId: string | number) => {
    const idStr = String(equipmentId);
    setFavorites((prev) => {
      if (!prev.includes(idStr)) {
        return [...prev, idStr];
      }
      return prev;
    });
  };

  const removeFromFavorites = (equipmentId: string | number) => {
    const idStr = String(equipmentId);
    setFavorites((prev) => prev.filter((id) => id !== idStr));
  };

  const isFavorite = (equipmentId: string | number) => {
    return favorites.includes(String(equipmentId));
  };

  const toggleFavorite = (equipmentId: string | number) => {
    if (isFavorite(equipmentId)) {
      removeFromFavorites(equipmentId);
    } else {
      addToFavorites(equipmentId);
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
