/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from 'react-router-dom';
import { formatPrice } from '../../utils/typeSafeFormatters';
import { normalizeImageUrl, getPlaceholderUrl } from '../../utils/imageUtils';
import { OptimizedImage } from '../../components/ui/OptimizedImage';
import type { Service } from '../../types/types';
import { FavoriteButton } from '../../components/ui/FavoriteButton';
import CompareButton from '../../components/ui/CompareButton';
import { memo, useCallback, useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { useNotifications } from '../../contexts/NotificationContext';

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'Ativo',
    badge: 'bg-success text-success-foreground',
    btnClass: 'bg-primary text-primary-foreground hover:bg-primary/90'
  },
  INACTIVE: {
    label: 'Inativo',
    badge: 'bg-destructive text-destructive-foreground',
    btnClass: 'bg-muted text-muted-foreground cursor-not-allowed'
  },
  MAINTENANCE: {
    label: 'Manutenção',
    badge: 'bg-warning text-warning-foreground',
    btnClass: 'bg-muted text-muted-foreground cursor-not-allowed'
  },
  COMING_SOON: {
    label: 'Em Breve',
    badge: 'bg-info text-info-foreground',
    btnClass: 'bg-muted text-muted-foreground cursor-not-allowed'
  },
} as const;

interface ServiceCardProps {
  service: Service;
  showCompare?: boolean;
  showFavorite?: boolean;
  className?: string;
}

const ServiceImage = memo(
  ({ imageUrl, name, status }: { imageUrl?: string; name: string; status: string }) => {
    const [imageError, setImageError] = useState(false);

    const handleImageError = useCallback(() => {
      setImageError(true);
    }, []);

    const normalizedUrl = normalizeImageUrl(imageUrl);
    const fallbackUrl = getPlaceholderUrl(name);
    const errorUrl = getPlaceholderUrl('Imagem Indisponível');
    
    const validStatus = (status in STATUS_CONFIG) ? status as keyof typeof STATUS_CONFIG : 'ACTIVE';
    const config = STATUS_CONFIG[validStatus];

    return (
      <div className="relative">
        <OptimizedImage
          src={imageError ? errorUrl : normalizedUrl || fallbackUrl}
          alt={`Serviço ${name}`}
          className="w-full h-48"
          objectFit="cover"
          onError={handleImageError}
          priority={false}
          width={400}
          height={300}
        />
        
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${config.badge}`}>
             {config.label}
          </span>
        </div>
      </div>
    );
  }
);

ServiceImage.displayName = 'ServiceImage';

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  showCompare = true,
  showFavorite = true,
  className = '',
  ...rest
}) => {
  const { addItem } = useCart();
  const { addNotification } = useNotifications();

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (service.status === 'ACTIVE' || !service.status) {
        addItem(service, 'service');
        addNotification({
            type: 'success',
            title: 'Serviço Adicionado',
            message: `${service.name} foi adicionado ao orçamento.`
        });
    }
  };

  const currentStatus = service.status || 'ACTIVE';
    const config = (STATUS_CONFIG as any)[currentStatus] || STATUS_CONFIG.ACTIVE;

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
          status={currentStatus}
        />

        {(showCompare || showFavorite) && (
          <div className="absolute top-2 right-2 flex space-x-2 z-20">
                        {showCompare && <CompareButton equipment={service as unknown as any} size="sm" />}
            {showFavorite && service.id && (
              <FavoriteButton equipmentId={service.id} equipmentName={service.name} size="sm" isService={true} />
            )}
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
          <button
            onClick={handleQuickAdd}
            disabled={currentStatus !== 'ACTIVE'}
            className={`font-bold py-2 px-4 rounded transition-colors ${config.btnClass}`}
            aria-label="Adicionar ao carrinho"
          >
            {currentStatus === 'ACTIVE' ? '+' : '−'}
          </button>
        </div>
      </div>
    </Link>
  );
};

export default memo(ServiceCard);
