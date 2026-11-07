// Caminho do arquivo: frontend/src/pages/client/CartPage.tsx

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { Package, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatPrice } from '../../utils/formatPrice';
import { RecommendationSection } from '../../components/ui/RecommendationSection';
import { useRecommendations } from '../../hooks/useRecommendations';
import { asArray } from '../../utils/normalize';
import type { Equipment, Service } from '../../types/types';
import type { StandardVariant } from '../../components/ui/StandardComponents';
import { Badge, Button, Card, ConfirmModal, buttonVariants } from '../../components/ui/StandardComponents';
import { ClientPage } from '../../components/client/ClientPage';
import { useEquipmentPriceUnit } from '../../hooks/usePricingRules';
import { kitCompactInfo } from '../../utils/kitInfo';

// Selo do tipo de item (antes: blue/emerald/orange fixos em 10px).
const itemTypeBadge: Record<'equipment' | 'service' | 'kit', { label: string; variant: StandardVariant }> = {
  equipment: { label: 'Equipamento', variant: 'primary' },
  service: { label: 'Serviço', variant: 'success' },
  kit: { label: 'Kit', variant: 'warning' },
};

export const CartPage = () => {
  const { cart, removeItem, itemCount, clearCart } = useCart();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  // Diária (lote 13): o equipamento avulso é cobrado na unidade da chave do servidor (EQUIPMENT_PRICE_UNIT),
  // lida na hora, também para o item guardado no navegador antes de a chave virar.
  const equipmentUnit = useEquipmentPriceUnit();

  // Equipamentos
    const equipmentItems = asArray<{ equipmentId: string; equipment: Equipment } | Equipment>(cart?.equipments).map((item) => {
    if ('equipmentId' in item) {
      return {
        id: item.equipmentId,
        name: item.equipment.name,
        price: item.equipment.pricePerHour || 0,
        images: item.equipment.imageUrl ? [item.equipment.imageUrl] : (item.equipment.images || []),
        type: 'equipment' as const,
      };
    }
    return {
      id: item.id,
      name: item.name,
      price: item.pricePerHour || 0,
      images: item.imageUrl ? [item.imageUrl] : (item.images || []),
      type: 'equipment' as const,
    };
  });

  // Serviços
    const serviceItems = asArray<Service>(cart?.services).map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price || 0,
    images: item.imageUrl ? [item.imageUrl] : [],
    type: 'service' as const,
  }));

  // Kit único
  const kitItem = cart?.kit
    ? [{
        id: cart.kit.id,
        name: cart.kit.name,
        price: cart.kit.price || 0,
        images: cart.kit.imageUrl ? [cart.kit.imageUrl] : [],
        type: 'kit' as const,
      }]
    : [];

  const items = [...equipmentItems, ...serviceItems, ...kitItem];

  const totalPrice = items.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const subtotal = totalPrice;
  const totalItems = items.length;

  // Get recommendations
  const firstItemId = items[0]?.id;
  const firstItemType = items[0]?.type;

  const complementaryRecommendations = useRecommendations({
    type: 'frequently-bought',
    itemId: firstItemId || '',
        itemType: firstItemType || 'equipment',
    limit: 4,
    autoFetch: !!firstItemId
  });

  const trendingRecommendations = useRecommendations({
    type: 'trending',
    limit: 4,
    autoFetch: totalItems === 0
  });

  const handleRemoveItem = async (itemId: string, itemName: string, type: 'equipment' | 'kit' | 'service') => {
    try {
      await removeItem(itemId, type);
      addNotification({
        type: 'success',
        title: 'Item removido',
        message: `${itemName} foi removido do carrinho`,
        duration: 3000,
      });
    } catch {
       addNotification({
        type: 'error',
        title: 'Erro ao remover',
        message: `Não foi possível remover ${itemName}`,
      });
    }
  };

  const handleClearCart = async () => {
    try {
      setClearing(true);
      await clearCart();
      setShowClearConfirm(false);
    } catch {
      // O CartContext já avisa o erro ("Erro ao limpar") — um segundo aviso aqui duplicava.
    } finally {
      setClearing(false);
    }
  };

  const handleProceedToQuote = () => {
    if (itemCount > 0) {
      ReactGA.event({
        category: "ecommerce",
        action: "begin_checkout",
        value: totalPrice,
        label: `Items: ${totalItems}`
      });

      addNotification({
        type: 'info',
        title: 'Redirecionando...',
        message: 'Direcionando para solicitar orçamento',
        duration: 2000,
      });
      navigate('/orcamento');
    } else {
      addNotification({
        type: 'warning',
        title: 'Carrinho vazio',
        message: 'Adicione itens ao carrinho antes de solicitar orçamento',
        duration: 4000,
      });
    }
  };

  if (totalItems === 0) {
    return (
      <ClientPage width="4xl">
        <Card className="space-y-8 p-6 text-center shadow-xl sm:p-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
            <ShoppingBag className="h-10 w-10" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Seu carrinho está vazio</h1>
            <p className="mx-auto max-w-md text-lg text-muted-foreground">
              Ainda não encontramos nenhum item por aqui. Que tal explorar nossos equipamentos e serviços?
            </p>
          </div>
          <div className="flex flex-col justify-center gap-4 pt-2 sm:flex-row">
            <Link to="/equipamentos" className={buttonVariants({ size: 'lg' })}>
              Ver Equipamentos
            </Link>
            <Link to="/servicos" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Nossos Serviços
            </Link>
          </div>
        </Card>

        {/* Trending Recommendations when empty */}
        {trendingRecommendations.recommendations.length > 0 && (
          <div className="mt-16">
            <RecommendationSection
              type="trending"
              items={trendingRecommendations.recommendations}
              maxItems={4}
              loading={trendingRecommendations.loading}
              viewAllLink="/equipamentos"
              viewAllText="Explorar Mais"
              columns={{ sm: 1, md: 2, lg: 4 }}
            />
          </div>
        )}
      </ClientPage>
    );
  }

  return (
    <ClientPage width="6xl">
      <Card className="p-4 shadow-xl sm:p-6 md:p-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Seu Carrinho
          </h1>
          <Badge variant="primary" size="lg">
            {totalItems} {totalItems === 1 ? 'item' : 'itens'}
          </Badge>
        </div>

        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={`${item.type}-${item.id}`}
              className="group flex items-start justify-between gap-3 rounded-2xl border border-border/50 bg-muted/10 p-3 transition-colors hover:border-border hover:bg-muted/20 sm:items-center sm:p-5"
            >
              <div className="flex min-w-0 items-center gap-3 sm:gap-6">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:h-24 sm:w-24">
                  {item.images?.[0] ? (
                    <img
                      src={item.images[0]}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    // Antes: imagem externa do placehold.co com cores fixas (#1f2937/#fff).
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground" aria-hidden="true">
                      <Package className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <Badge variant={itemTypeBadge[item.type].variant} size="sm" className="mb-2">
                    {itemTypeBadge[item.type].label}
                  </Badge>
                  <h2 className="mb-1 break-words text-lg font-bold text-foreground sm:text-2xl">{item.name}</h2>
                  <p className="text-lg font-bold text-primary sm:text-xl">
                    {formatPrice(item.price)}{' '}
                    {/* Decisão do dono de 06/11: kit por evento; equipamento avulso por hora ou por diária (EQUIPMENT_PRICE_UNIT). */}
                    <span className="text-sm font-normal text-muted-foreground">{item.type === 'service' ? '/ serviço' : item.type === 'kit' ? 'por evento' : equipmentUnit === 'day' ? '/ diária' : '/ hora'}</span>
                  </p>
                  {/* Lote 13 (06/11/2026): o tipo do kit e as horas incluídas, como no cartão do kit. */}
                  {item.type === 'kit' && cart?.kit && (
                    <p className="text-xs text-muted-foreground">{kitCompactInfo(cart.kit)}</p>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveItem(item.id, item.name, item.type)}
                className="h-11 w-11 shrink-0 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                aria-label={`Remover ${item.name} do carrinho`}
              >
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>

        <div className="mt-10 border-t-2 border-dashed border-border pt-8">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="max-w-md space-y-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Subtotal parcial</span>
              <div className="text-4xl font-bold text-foreground sm:text-5xl">
                {formatPrice(subtotal)}
              </div>
              <p className="leading-relaxed text-muted-foreground">
                Este valor é uma estimativa parcial. Kits têm preço por evento, com hora extra quando o evento passa das horas incluídas no kit; equipamentos avulsos são {equipmentUnit === 'day' ? 'cobrados por diária (cada 24 horas do evento, com o mínimo de diárias de cada um)' : 'multiplicados pela duração do seu evento'}, e os serviços possuem valor fixo. Taxas de transporte serão validadas por nossa equipe.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <Button variant="outline" size="lg" onClick={() => setShowClearConfirm(true)}>
                Esvaziar Carrinho
              </Button>
              <Button size="lg" onClick={handleProceedToQuote}>
                Seguir para Orçamento
              </Button>
            </div>
          </div>
        </div>

        {/* Recomendações Complementares */}
        {complementaryRecommendations.recommendations.length > 0 && (
          <div className="mt-16 border-t border-border pt-12">
            <RecommendationSection
              type="frequently-bought"
              title="Aproveite e Adicione"
              items={complementaryRecommendations.recommendations}
              maxItems={4}
              loading={complementaryRecommendations.loading}
              viewAllLink="/equipamentos"
              viewAllText="Ver Todas"
              columns={{ sm: 1, md: 2, lg: 4 }}
            />
          </div>
        )}
      </Card>

      {/* Antes: confirm() nativo do navegador. */}
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearCart}
        title="Esvaziar carrinho"
        message="Remover todos os itens do carrinho?"
        confirmText="Esvaziar"
        variant="danger"
        isLoading={clearing}
      />
    </ClientPage>
  );
};
export default CartPage;
