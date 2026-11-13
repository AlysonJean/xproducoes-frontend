// src/shared/KitCard.tsx

import { Link } from 'react-router-dom';
import type { Kit, Equipment } from '../../types/types';
import { formatPrice } from '../../utils/typeSafeFormatters';
import { normalizeImageUrl, getPlaceholderUrl } from '../../utils/imageUtils';
import { FavoriteButton } from './FavoriteButton';
import CompareButton from './CompareButton';
import { OptimizedImage } from './OptimizedImage';
import { memo, useCallback, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Button } from './Button';
import { useCart } from '../../hooks/useCart';
import { useNotifications } from '../../contexts/NotificationContext';
import { kitCompactInfo } from '../../utils/kitInfo';
import { isAvailableForOrder } from '../../utils/cartCatalog';

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
        {/* Achado (Lighthouse/axe-core contra produção real): bg-orange-500 com texto branco
            tinha contraste 2.8:1 (WCAG exige 4.5:1 para texto de 12px). O token warning, corrigido na
            auditoria do design system, passa (5.05:1) e funciona também no tema escuro. */}
        <span className="px-2 py-1 rounded-full text-xs font-bold bg-warning text-warning-foreground shadow-sm">
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
  // Auditoria do orçamento (12/11/2026), O23: o "+" só põe no orçamento o kit ATIVO; o kit "em breve" ou em manutenção
  // entrava no carrinho e só voltava no envio do pedido.
  const canAdd = isAvailableForOrder(kit);

  const handleQuickAdd = async (e: React.MouseEvent) => {
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
    if (!canAdd) return;

    // O carrinho avisa o resultado (e pergunta antes de trocar outro kit, O24); antes este cartão dizia "Kit
    // Adicionado" na hora, mesmo quando nada entrava.
    try {
      await addItem(kit, 'kit');
    } catch {
      // O carrinho já mostrou o erro.
    }
  };

  // Achado (Lighthouse/axe-core contra produção real): mesmo problema do EquipmentCard —
  // aria-label fixo não incluía o texto visível "Ver Detalhes do Kit" nem outros elementos do
  // card, violando WCAG 2.5.3 (Label in Name). Removido para o nome acessível vir do conteúdo
  // real do card.
  // Achado (auditoria do design system): os botões (comparar, favoritar, adicionar) ficavam DENTRO do
  // <Link> — interativo dentro de interativo (HTML inválido; leitor de tela anunciava o card inteiro
  // como um link com botões dentro). Agora o Link cobre imagem + título + descrição e os botões são
  // irmãos dele, por cima da imagem / no rodapé. O "adicionar" usava `.btn .btn-default` (CSS global
  // fora do componente padrão); agora é o Button.
  return (
    <div
      {...rest}
      className={`relative card-glass card-glass-hover rounded-2xl overflow-hidden ${className}`}
    >
      <Link
        to={`/kits/${kit.slug || kit.id}`}
        className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="relative">
          <KitImage
            imageUrl={kit.imageUrl}
            name={kit.name}
          />

          <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-tl-lg pointer-events-none">
            Ver Detalhes do Kit
          </div>
        </div>

        <div className="px-4 pt-4">
          <h3 className="text-xl font-bold mb-2 truncate text-foreground">{kit.name}</h3>

          {kit.description && (
            <p className="text-muted-foreground text-sm mb-4 h-10 overflow-hidden line-clamp-2">
              {kit.description}
            </p>
          )}
        </div>
      </Link>

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
                isAvailable: kit.isActive ?? true,
                // O23: a comparação sabe se o kit pode ir ao orçamento.
                status: kit.status
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

      <div className="flex justify-between items-center px-4 pb-4 mt-4">
        <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">a partir de</span>
            <span className="text-lg font-bold text-primary">
              {/* Decisão do dono de 06/11: o preço do kit é por evento, nunca por hora. */}
              {formatPrice(kit.price || 0)} <span className="text-xs font-normal">por evento</span>
            </span>
            {/* Lote 13 (06/11/2026): o tipo do kit e as horas incluídas, em poucas palavras. */}
            <span className="text-xs text-muted-foreground">{kitCompactInfo(kit)}</span>
        </div>
        <Button
          type="button"
          size="icon"
          onClick={handleQuickAdd}
          disabled={isAlreadyInCart || !canAdd}
          title={!canAdd ? 'Indisponível no momento' : undefined}
          aria-label={isAlreadyInCart ? `${kit.name} já está no orçamento` : canAdd ? `Adicionar ${kit.name} ao orçamento` : `${kit.name}: indisponível no momento`}
        >
          {isAlreadyInCart ? <Check className="h-5 w-5" aria-hidden="true" /> : <Plus className="h-5 w-5" aria-hidden="true" />}
        </Button>
      </div>
    </div>
  );
};

export default memo(KitCard);
