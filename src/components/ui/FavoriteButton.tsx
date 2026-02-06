import { useFavorites } from '../../contexts/FavoritesContext';
import { useNotifications } from '../../contexts/NotificationContext';

import type { FavoriteButtonProps } from '@/types/ui';

import type { FavoriteType } from '../../contexts/FavoritesContext';

export const FavoriteButton = ({
  equipmentId,
  equipmentName,
  className = '',
  size = 'md',
  type,
  isService,
  isKit,
}: FavoriteButtonProps & { type?: FavoriteType; isService?: boolean; isKit?: boolean }) => {
  const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();
  const { addNotification } = useNotifications();
  const favorite = isFavorite(equipmentId);
  
  const itemType: FavoriteType = type || (isService ? 'service' : isKit ? 'kit' : 'equipment');

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault(); // Previne navegação se o botão estiver dentro de um link
    e.stopPropagation();

    if (favorite) {
      removeFromFavorites(equipmentId);
    } else {
      addToFavorites(equipmentId, itemType);
    }

    if (favorite) {
      addNotification({
        type: 'info',
        title: 'Favorito removido',
        message: 'Equipamento removido dos favoritos',
      });
    } else {
      addNotification({
        type: 'success',
        title: 'Favorito adicionado',
        message: `${equipmentName} foi adicionado aos favoritos!`,
      });
    }
  };

  const sizeClasses = {
    sm: 'icon-btn-sm',
    md: 'icon-btn',
    lg: 'icon-btn',
  } as const;

  return (
  <button
      onClick={handleToggle}
      className={`
                ${sizeClasses[size]}
        ${favorite ? 'text-red-500 hover:text-red-600' : 'text-white hover:text-red-300'}
        drop-shadow-lg hover:drop-shadow-xl
                ${className}
            `}
      title={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
    >
      <svg
    fill={favorite ? 'currentColor' : 'none'}
    stroke="currentColor"
        viewBox="0 0 24 24"
    className="w-5 h-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={favorite ? 0 : 2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  );
};
export default FavoriteButton;
