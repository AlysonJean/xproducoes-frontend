// src/components/EquipmentCard.tsx

import { Link } from 'react-router-dom';
import { formatPrice } from '../../utils/typeSafeFormatters'; // Caminho correto
import { normalizeImageUrl, getPlaceholderUrl } from '../../utils/imageUtils';
import type { Equipment } from '../../types/types';
import { FavoriteButton } from '../../components/ui/FavoriteButton';
import CompareButton from '../../components/ui/CompareButton';
import { memo, useCallback, useState } from 'react';

// Constantes para disponibilidade
const AVAILABILITY_CONFIG = {
  MESSAGES: {
    AVAILABLE: 'Disponível',
    UNAVAILABLE: 'Indisponível',
  },
  STYLES: {
  // Verde consistente em ambos temas
  AVAILABLE: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-50',
    UNAVAILABLE: 'bg-destructive text-destructive-foreground',
  },
} as const;

interface EquipmentCardProps {
  equipment: Equipment;
  onCardClick?: (equipmentId: string) => void;
  showCompare?: boolean;
  showFavorite?: boolean;
  className?: string;
}

// Componente de imagem com tratamento de erro otimizado
const EquipmentImage = memo(
  ({ imageUrl, name, isAvailable }: { imageUrl?: string; name: string; isAvailable: boolean }) => {
    const [imageError, setImageError] = useState(false);

    const handleImageError = useCallback(() => {
      setImageError(true);
    }, []);

    // Normaliza URLs do Cloudinary (converte "demo" para local)
    const normalizedUrl = normalizeImageUrl(imageUrl);
    const fallbackUrl = getPlaceholderUrl(name);
    const errorUrl = getPlaceholderUrl('Imagem Indisponível');

    return (
      <div className="relative">
        <img
          src={imageError ? errorUrl : normalizedUrl || fallbackUrl}
          alt={`Equipamento ${name}`}
          className="w-full h-48 object-cover"
          onError={handleImageError}
          loading="lazy"
          decoding="async"
        />
        
        {/* Badge de disponibilidade */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
            isAvailable 
              ? AVAILABILITY_CONFIG.STYLES.AVAILABLE 
              : AVAILABILITY_CONFIG.STYLES.UNAVAILABLE
          }`}>
            {isAvailable 
              ? AVAILABILITY_CONFIG.MESSAGES.AVAILABLE 
              : AVAILABILITY_CONFIG.MESSAGES.UNAVAILABLE
            }
          </span>
        </div>
        
        {!isAvailable && (
          <div
            className="absolute inset-0 bg-surface/80 flex items-center justify-center"
            aria-label="Equipamento indisponível"
          >
            <span className="text-danger font-bold text-lg">INDISPONÍVEL</span>
          </div>
        )}
      </div>
    );
  }
);

EquipmentImage.displayName = 'EquipmentImage';

export const EquipmentCard: React.FC<EquipmentCardProps> = ({
  equipment,
  onCardClick,
  showCompare = true,
  showFavorite = true,
  className = '',
  ...rest
}) => {
  return (
    <Link
      {...rest}
      to={`/equipments/${equipment.id}`}
      className={`relative block bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] ${className}`}
      onClick={() => {
        if (equipment.id && onCardClick) onCardClick(equipment.id);
      }}
      aria-label={`Ver detalhes do equipamento ${equipment.name}`}
    >
      {/* Área de imagem + overlays dentro de um wrapper relativo para posicionamento correto */}
      <div className="relative">
        <EquipmentImage
          imageUrl={equipment.imageUrl}
          name={equipment.name}
          isAvailable={equipment.isAvailable ?? true}
        />

        {/* Botões de Favoritar e Comparar */}
        {(showCompare || showFavorite) && (
          <div className="absolute top-2 right-2 flex space-x-2 z-20">
            {showCompare && <CompareButton equipment={equipment} size="sm" />}
            {showFavorite && equipment.id && (
              <FavoriteButton equipmentId={equipment.id} equipmentName={equipment.name} size="sm" />
            )}
          </div>
        )}

        <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-tl-lg pointer-events-none">
          Ver Detalhes
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-xl font-bold mb-2 truncate text-foreground">{equipment.name}</h3>

        {equipment.description && (
          <p className="text-muted-foreground text-sm mb-4 h-10 overflow-hidden line-clamp-2">
            {equipment.description}
          </p>
        )}

        {equipment.brand && equipment.model && (
          <p className="text-muted-foreground text-xs mb-2">
            {equipment.brand} - {equipment.model}
          </p>
        )}

        {equipment.tags && equipment.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {equipment.tags.slice(0, 3).map((tag: string, index: number) => (
              <span key={index} className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded">
                {tag}
              </span>
            ))}
            {equipment.tags.length > 3 && (
              <span className="text-muted-foreground text-xs">+{equipment.tags.length - 3}</span>
            )}
          </div>
        )}

  <div className="flex justify-between items-center mt-4">
          <span className="text-lg font-semibold text-primary">
            {formatPrice(equipment.pricePerHour || 0)} / hora
          </span>
          <div
            className={`font-bold py-2 px-4 rounded transition-colors ${
              equipment.isAvailable
    ? 'bg-success text-success-foreground hover:bg-success/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
            aria-label={
              equipment.isAvailable ? 'Adicionar ao carrinho' : 'Equipamento indisponível'
            }
          >
            {equipment.isAvailable ? '+' : '−'}
          </div>
        </div>
      </div>
    </Link>
  );
};
