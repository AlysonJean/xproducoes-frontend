import { Link } from 'react-router-dom';
import { formatPrice } from '../../utils/typeSafeFormatters';
import { normalizeImageUrl, getPlaceholderUrl } from '../../utils/imageUtils';
import type { Service } from '../../types/types';
import { FavoriteButton } from '../../components/ui/FavoriteButton';
import { memo, useCallback, useState } from 'react';

// Constantes para status (Serviços não têm "disponibilidade" da mesma forma que equipamentos, mas têm status)
const STATUS_CONFIG = {
  MESSAGES: {
    ACTIVE: 'Ativo',
    INACTIVE: 'Inativo',
    MAINTENANCE: 'Manutenção',
    COMING_SOON: 'Em Breve',
  },
  STYLES: {
    ACTIVE: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-50',
    INACTIVE: 'bg-destructive text-destructive-foreground',
    MAINTENANCE: 'bg-yellow-500 text-black',
    COMING_SOON: 'bg-blue-500 text-white',
  },
} as const;

interface ServiceCardProps {
  service: Service;
  showFavorite?: boolean;
  className?: string;
}

// Componente de imagem com tratamento de erro otimizado
const ServiceImage = memo(
  ({ imageUrl, name, status }: { imageUrl?: string; name: string; status: string }) => {
    const [imageError, setImageError] = useState(false);

    const handleImageError = useCallback(() => {
      setImageError(true);
    }, []);

    const normalizedUrl = normalizeImageUrl(imageUrl);
    const fallbackUrl = getPlaceholderUrl(name);
    const errorUrl = getPlaceholderUrl('Imagem Indisponível');
    
    // Fallback status if somehow missing or invalid
    const validStatus = (status in STATUS_CONFIG.STYLES) ? status as keyof typeof STATUS_CONFIG.STYLES : 'ACTIVE';

    return (
      <div className="relative">
        <img
          src={imageError ? errorUrl : normalizedUrl || fallbackUrl}
          alt={`Serviço ${name}`}
          className="w-full h-48 object-cover"
          onError={handleImageError}
          loading="lazy"
          decoding="async"
        />
        
        {/* Badge de status */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_CONFIG.STYLES[validStatus]}`}>
             {STATUS_CONFIG.MESSAGES[validStatus]}
          </span>
        </div>
      </div>
    );
  }
);

ServiceImage.displayName = 'ServiceImage';

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  showFavorite = true,
  className = '',
  ...rest
}) => {
  return (
    <Link
      {...rest}
      to={`/servicos/${service.slug || service.id}`}
      className={`relative block bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] ${className}`}
      aria-label={`Ver detalhes do serviço ${service.name}`}
    >
      <div className="relative">
        <ServiceImage
          imageUrl={service.imageUrl}
          name={service.name}
          status={service.status || 'ACTIVE'}
        />

        {showFavorite && service.id && (
          <div className="absolute top-2 right-2 flex space-x-2 z-20">
            <FavoriteButton equipmentId={service.id} equipmentName={service.name} size="sm" isService={true} /> 
          </div>
        )}

        <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-tl-lg pointer-events-none">
          Ver Detalhes
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-xl font-bold mb-2 truncate text-foreground">{service.name}</h3>

        {service.description && (
          <p className="text-muted-foreground text-sm mb-4 h-10 overflow-hidden line-clamp-2">
            {service.description}
          </p>
        )}

        <div className="flex justify-between items-center mt-4">
          <span className="text-lg font-semibold text-primary">
            <span className="text-xs font-normal mr-1">a partir de</span>
            {formatPrice(service.price || 0)}
          </span>
          <div className="font-bold py-2 px-4 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            Ver
          </div>
        </div>
      </div>
    </Link>
  );
};
