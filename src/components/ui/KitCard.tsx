// src/shared/KitCard.tsx

import { Link } from 'react-router-dom';
import type { KitCardProps } from '../../types/types';
import { formatPrice } from '../../utils/typeSafeFormatters';
import { normalizeImageUrl, getPlaceholderUrl } from '../../utils/imageUtils';
import { FavoriteButton } from './FavoriteButton';
import CompareButton from './CompareButton';

export const KitCard: React.FC<KitCardProps> = ({ kit, showCompare = true, showFavorite = true, ...rest }) => {
  // Normaliza URL do Cloudinary (converte "demo" cloud para local)
  const imageUrl = normalizeImageUrl(kit.imageUrl) || getPlaceholderUrl(kit.name);

  return (
    <Link
      {...rest}
      to={`/kits/${kit.id}`}
  className="relative block bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
    >
  <div className="relative">
        <img
          src={imageUrl}
          alt={`Imagem de ${kit.name}`}
          className="w-full h-48 object-cover"
          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
            e.currentTarget.src = getPlaceholderUrl('Imagem Indisponível');
          }}
        />
        
        {/* Botões de Favoritar e Comparar */}
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
                }} 
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
        
        <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-tl-lg">
          Ver Detalhes do Kit
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-xl font-bold text-foreground mb-2 truncate">{kit.name}</h3>
        <p className="text-muted-foreground text-sm mb-4 h-10 overflow-hidden">{kit.description}</p>
        <div className="flex justify-between items-center mt-4">
          <span className="text-lg font-semibold text-primary">
            <span className="text-xs font-normal mr-1">a partir de</span>
            {formatPrice(kit.price ?? 0)}
          </span>
          <div className="bg-secondary text-secondary-foreground hover:bg-secondary/80 font-bold py-2 px-4 rounded transition-colors">
            Alugar Kit
          </div>
        </div>
      </div>
    </Link>
  );
};
