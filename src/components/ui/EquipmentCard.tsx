// src/components/EquipmentCard.tsx

import { Link } from 'react-router-dom';
import { formatPrice } from '../../utils/typeSafeFormatters'; // Caminho correto
import { normalizeImageUrl, getPlaceholderUrl } from '../../utils/imageUtils';
import { OptimizedImage } from '../../components/ui/OptimizedImage';
import type { Equipment } from '../../types/types';
import { FavoriteButton } from '../../components/ui/FavoriteButton';
import CompareButton from '../../components/ui/CompareButton';
import { memo, useCallback, useState } from 'react';

// Constantes para disponibilidade
// Achado (Lighthouse/axe-core contra produção real): badge MAINTENANCE (bg-orange-500) e
// COMING_SOON (bg-blue-500) com texto branco tinham contraste 2.8:1/2.86:1 (WCAG exige
// 4.5:1). orange-700/blue-700 são locais a este componente, não tokens de tema
// compartilhados — ACTIVE/UNAVAILABLE já usam os tokens success/destructive corretamente.
const STATUS_CONFIG = {
  ACTIVE: {
    label: 'Disponível',
    badge: 'bg-success text-success-foreground',
    overlay: null,
    btnClass: 'bg-success text-success-foreground hover:bg-success/90'
  },
  MAINTENANCE: {
    label: 'Em Manutenção',
    badge: 'bg-orange-700 text-white',
    overlay: 'EM MANUTENÇÃO',
    btnClass: 'bg-muted text-muted-foreground cursor-not-allowed'
  },
  COMING_SOON: {
    label: 'Em Breve',
    badge: 'bg-blue-700 text-white',
    overlay: 'EM BREVE',
    btnClass: 'bg-muted text-muted-foreground cursor-not-allowed'
  },
  UNAVAILABLE: {
    label: 'Indisponível',
    badge: 'bg-destructive text-destructive-foreground',
    overlay: 'INDISPONÍVEL',
    btnClass: 'bg-muted text-muted-foreground cursor-not-allowed'
  }
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
  ({ imageUrl, name, status, isAvailable }: { imageUrl?: string; name: string; status?: string; isAvailable: boolean }) => {
    const [imageError, setImageError] = useState(false);

    const handleImageError = useCallback(() => {
      setImageError(true);
    }, []);

    // Normaliza URLs do Cloudinary (converte "demo" para local)
    const normalizedUrl = normalizeImageUrl(imageUrl);
    const fallbackUrl = getPlaceholderUrl(name);
    const errorUrl = getPlaceholderUrl('Imagem Indisponível');

    // Determinar configuração de status
    const getStatusConfig = () => {
      if (status === 'MAINTENANCE') return STATUS_CONFIG.MAINTENANCE;
      if (status === 'COMING_SOON') return STATUS_CONFIG.COMING_SOON;
      return isAvailable ? STATUS_CONFIG.ACTIVE : STATUS_CONFIG.UNAVAILABLE;
    };

    const config = getStatusConfig();

    return (
      <div className="relative">
        <OptimizedImage
          src={imageError ? errorUrl : normalizedUrl || fallbackUrl}
          alt={`Equipamento ${name}`}
          className="w-full h-48"
          objectFit="cover"
          onError={handleImageError}
          priority={false}
          width={400}
          height={300}
        />
        
        {/* Badge de disponibilidade */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${config.badge}`}>
            {config.label}
          </span>
        </div>
        
        {config.overlay && (
          <div
            className="absolute inset-0 bg-surface/80 flex items-center justify-center p-4 text-center"
            aria-label={`Equipamento ${config.label}`}
          >
            <span className={`${status === 'MAINTENANCE' ? 'text-orange-500' : status === 'COMING_SOON' ? 'text-blue-500' : 'text-danger'} font-bold text-lg uppercase`}>
              {config.overlay}
            </span>
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
  // Achado (Lighthouse/axe-core contra produção real): este Link tinha um aria-label fixo
  // ("Ver detalhes do equipamento X") que substituía todo o nome acessível — mas o card
  // visualmente também mostra o badge de status (StatusOverlay: "Disponível"/"Em Breve"/
  // "Manutenção"), que ficava de fora do aria-label. Resultado: WCAG 2.5.3 (Label in Name)
  // violado — quem usa controle por voz não conseguia dizer "clique em Disponível" porque
  // esse texto não fazia parte do nome acessível do link. Removido o aria-label para o nome
  // acessível ser computado a partir do conteúdo visível real do card (inclui tudo).
  return (
    <Link
      {...rest}
      to={`/equipamentos/${equipment.slug || equipment.id}`}
      className={`relative block bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] ${className}`}
      onClick={() => {
        if (equipment.id && onCardClick) onCardClick(equipment.id);
      }}
    >
      {/* Área de imagem + overlays dentro de um wrapper relativo para posicionamento correto */}
      <div className="relative">
        <EquipmentImage
          imageUrl={equipment.imageUrl}
          name={equipment.name}
          status={equipment.status}
          isAvailable={equipment.isAvailable ?? true}
        />

        {/* Botões de Favoritar e Comparar */}
        {(showCompare || showFavorite) && (
          <div className="absolute top-2 right-2 flex space-x-2 z-20">
            {showCompare && <CompareButton equipment={equipment} size="sm" itemType="equipment" />}
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
            <span className="text-xs font-normal mr-1">a partir de</span>
            {formatPrice(equipment.pricePerHour || 0)} / hora
          </span>
          {/* Achado (auditoria mobile-first): tinha aria-label="Adicionar ao carrinho", mas
              este é um <div> decorativo dentro do <Link> do card inteiro — clicar aqui não
              adiciona nada ao carrinho, só navega para os detalhes (onde o carrinho de
              verdade fica). O aria-label prometia uma ação inexistente para quem usa leitor
              de tela. O status em si já é anunciado pelo badge visível no topo do card (ver
              comentário acima sobre o nome acessível do Link), então aria-hidden aqui. */}
          <div
            aria-hidden="true"
            className={`font-bold py-2 px-4 rounded transition-colors ${
              (equipment.status === 'MAINTENANCE' || equipment.status === 'COMING_SOON')
                ? STATUS_CONFIG[equipment.status as 'MAINTENANCE' | 'COMING_SOON'].btnClass
                : equipment.isAvailable
                  ? STATUS_CONFIG.ACTIVE.btnClass
                  : STATUS_CONFIG.UNAVAILABLE.btnClass
            }`}
          >
            {equipment.isAvailable ? '+' : '−'}
          </div>
        </div>
      </div>
    </Link>
  );
};
