// src/shared/KitCard.tsx

import { Link } from 'react-router-dom';
import type { Kit, Equipment } from '../../types/types';
import { formatPrice } from '../../utils/typeSafeFormatters';
import { normalizeImageUrl, getPlaceholderUrl } from '../../utils/imageUtils';
import { FavoriteButton } from './FavoriteButton';
import CompareButton from './CompareButton';
import { OptimizedImage } from './OptimizedImage';
import { memo, useCallback, useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { useNotifications } from '../../contexts/NotificationContext';

interface KitCardProps {
  kit: Kit;
  showCompare?: boolean;
  showFavorite?: boolean;
  className?: string;
}

const KitImage = memo(({ imageUrl, name }: { imageUrl?: string; name: string }) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const normalizedUrl = normalizeImageUrl(imageUrl);
  const fallbackUrl = getPlaceholderUrl(name);
  const errorUrl = getPlaceholderUrl('Imagem Indisponível');

  return (
    <div className="relative">
      <OptimizedImage
        src={imageError ? errorUrl : normalizedUrl || fallbackUrl}
        alt={`Kit ${name}`}
        className="w-full h-48"
        objectFit="cover"
        onError={handleImageError}
        priority={false}
        width={400}
        height={300}
      />
      
      <div className="absolute top-2 left-2">
        <span className="px-2 py-1 rounded-full text-xs font-bold bg-orange-500 text-white shadow-sm">
           Combo Econômico
        </span>
      </div>
    </div>
  );
});

KitImage.displayName = 'KitImage';

export const KitCard: React.FC<KitCardProps> = ({
  kit,
  showCompare = true,
  showFavorite = true,
  className = '',
  ...rest
}) => {
  const { addItem, cart } = useCart();
  const { addNotification } = useNotifications();

  const isAlreadyInCart = cart?.kit?.id === kit.id;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isAlreadyInCart) {
        addNotification({
            type: 'warning',
            title: 'Kit já no Carrinho',
            message: 'Este kit já foi adicionado ao seu orçamento.'
        });
        return;
    }

    addItem(kit, 'kit');
    addNotification({
        type: 'success',
        title: 'Kit Adicionado',
        message: `${kit.name} foi adicionado ao seu orçamento.`
    });
  };

  // Achado (Lighthouse/axe-core contra produção real): mesmo problema do EquipmentCard —
  // aria-label fixo não incluía o texto visível "Ver Detalhes do Kit" nem outros elementos do
  // card, violando WCAG 2.5.3 (Label in Name). Removido para o nome acessível vir do conteúdo
  // real do card.
  return (
    <Link
      {...rest}
      to={`/kits/${kit.slug || kit.id}`}
      className={`relative block card-glass card-glass-hover rounded-2xl overflow-hidden ${className}`}
    >
      <div className="relative">
        <KitImage
          imageUrl={kit.imageUrl}
          name={kit.name}
        />

        {(showCompare || showFavorite) && (
          <div className="absolute top-2 right-2 flex space-x-2 z-20">
            {showCompare && (
              <CompareButton
                equipment={{
                  id: kit.id,
                  name: kit.name,
                  description: kit.description,
                  pricePerHour: kit.price,
                  imageUrl: kit.imageUrl,
                  isAvailable: kit.isActive ?? true
                } satisfies Equipment}
                itemType="kit"
                size="sm"
              />
            )}
            {showFavorite && kit.id && (
              <FavoriteButton 
                equipmentId={kit.id} 
                equipmentName={kit.name} 
                size="sm" 
              />
            )}
          </div>
        )}

        <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-tl-lg pointer-events-none">
          Ver Detalhes do Kit
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-xl font-bold mb-2 truncate text-foreground">{kit.name}</h3>

        {kit.description && (
          <p className="text-muted-foreground text-sm mb-4 h-10 overflow-hidden line-clamp-2">
            {kit.description}
          </p>
        )}

        <div className="flex justify-between items-center mt-4">
          <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">a partir de</span>
              <span className="text-lg font-bold text-primary">
                {formatPrice(kit.price || 0)} <span className="text-xs font-normal">/ hora</span>
              </span>
          </div>
          <button
            onClick={handleQuickAdd}
            disabled={isAlreadyInCart}
            className={`py-2 px-4 transition-colors ${
              isAlreadyInCart 
                ? 'bg-muted text-muted-foreground cursor-not-allowed rounded-lg' 
                : 'btn btn-default rounded-xl'
            }`}
            aria-label="Adicionar kit ao carrinho"
          >
            {isAlreadyInCart ? '✓' : '+'}
          </button>
        </div>
      </div>
    </Link>
  );
};

export default memo(KitCard);
