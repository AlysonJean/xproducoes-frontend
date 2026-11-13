// Caminho do arquivo: frontend/src/pages/client/CartPage.tsx

import { useEffect, useState } from 'react';
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
import { Alert, Badge, Button, Card, ConfirmModal, buttonVariants } from '../../components/ui/StandardComponents';
import { ClientPage } from '../../components/client/ClientPage';
import { useEquipmentPriceUnit, useFreightRules } from '../../hooks/usePricingRules';
import { kitCompactInfo } from '../../utils/kitInfo';
import { equipmentUnitText, equipmentUnitsForHours, serviceMinutesText } from '../../utils/bookingPricing';
import { isAvailableForOrder, kitServiceIds } from '../../utils/cartCatalog';
import { freightRulesText, orderNeedsDelivery } from '../../utils/freightInfo';

// Selo do tipo de item (antes: blue/emerald/orange fixos em 10px).
const itemTypeBadge: Record<'equipment' | 'service' | 'kit', { label: string; variant: StandardVariant }> = {
  equipment: { label: 'Equipamento', variant: 'primary' },
  service: { label: 'Serviço', variant: 'success' },
  kit: { label: 'Kit', variant: 'warning' },
};

// Auditoria do orçamento (12/11/2026), O5/A8, O19 e E1: cada linha do carrinho diz como o item é cobrado e quanto entra
// na estimativa. `subtotal` é o que a linha soma; `note` explica (mínimo de diárias, regra do técnico, incluso no kit).
interface CartLine {
  id: string;
  name: string;
  price: number | string;
  images: string[];
  type: 'equipment' | 'service' | 'kit';
  subtotal: number;
  unitLabel: string;
  note?: string;
  available: boolean;
  includedInKit?: boolean;
}

export const CartPage = () => {
  const { cart, removeItem, itemCount, clearCart, refreshCart } = useCart();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  // Diária (lote 13): o equipamento avulso é cobrado na unidade da chave do servidor (EQUIPMENT_PRICE_UNIT),
  // lida na hora, também para o item guardado no navegador antes de a chave virar.
  const equipmentUnit = useEquipmentPriceUnit();
  const freightRules = useFreightRules();

  // Auditoria do orçamento (12/11/2026), O19: ao abrir, o carrinho do navegador é relido do catálogo.
  useEffect(() => {
    Promise.resolve(refreshCart?.()).catch(() => undefined);
  }, [refreshCart]);

  // Equipamentos. O5/A8: na diária, a estimativa conta o mínimo de diárias de cada equipamento, como o servidor.
  const equipmentItems: CartLine[] = asArray<{ equipmentId: string; equipment: Equipment } | Equipment>(cart?.equipments).map((entry) => {
    const item: Equipment = 'equipmentId' in entry ? { ...entry.equipment, id: entry.equipmentId } : entry;
    const units = equipmentUnitsForHours(equipmentUnit, 1, item.minimumRentalDuration ?? null) ?? 1;
    const available = isAvailableForOrder(item);
    const unitPrice = Number(item.pricePerHour) || 0;
    return {
      id: item.id,
      name: item.name,
      price: item.pricePerHour || 0,
      images: item.imageUrl ? [item.imageUrl] : (item.images || []),
      type: 'equipment' as const,
      subtotal: available ? unitPrice * units : 0,
      unitLabel: equipmentUnit === 'day' ? '/ diária' : '/ hora',
      note: units > 1 ? `Mínimo de ${equipmentUnitText(units, equipmentUnit)}: ${formatPrice(unitPrice * units)}` : undefined,
      available,
    };
  });

  // Serviços. O5/A8: o que acompanha o evento todo mostra a regra (cobra pelas horas do evento), não "/ serviço". E1: o
  // serviço que o kit do carrinho já traz aparece como incluso e não soma.
  const kitServices = kitServiceIds(cart?.kit);
  const serviceItems: CartLine[] = asArray<Service>(cart?.services).map((item) => {
    const includedInKit = kitServices.has(item.id);
    const available = isAvailableForOrder(item);
    const minutes = Number(item.duration);
    const wholeEvent = item.coversWholeEvent === true && Number.isInteger(minutes) && minutes > 0;
    return {
      id: item.id,
      name: item.name,
      price: item.price || 0,
      images: item.imageUrl ? [item.imageUrl] : [],
      type: 'service' as const,
      subtotal: available && !includedInKit ? Number(item.price) || 0 : 0,
      unitLabel: wholeEvent ? `até ${serviceMinutesText(minutes)} de evento` : '/ serviço',
      note: includedInKit
        ? 'Já vem no kit do carrinho: não é cobrado de novo.'
        : wholeEvent
          ? 'Acompanha o evento todo: cada hora a mais sai proporcional, pelas horas do seu evento.'
          : undefined,
      available,
      includedInKit,
    };
  });

  // Kit único
  const kitAvailable = isAvailableForOrder(cart?.kit);
  const kitItem: CartLine[] = cart?.kit
    ? [{
        id: cart.kit.id,
        name: cart.kit.name,
        price: cart.kit.price || 0,
        images: cart.kit.imageUrl ? [cart.kit.imageUrl] : [],
        type: 'kit' as const,
        subtotal: kitAvailable ? Number(cart.kit.price) || 0 : 0,
        unitLabel: 'por evento',
        available: kitAvailable,
      }]
    : [];

  const items = [...equipmentItems, ...serviceItems, ...kitItem];
  const unavailableNames = items.filter((item) => !item.available).map((item) => item.name);

  const totalPrice = items.reduce((acc, item) => acc + item.subtotal, 0);
  // Frete (decisão de 12/11/2026): calculado pela distância e mostrado na proposta; o texto da regra vem de freightInfo.
  const hasDelivery = orderNeedsDelivery(cart?.kit, equipmentItems.length);
  const freightSentence = !hasDelivery
    ? null
    : freightRules
      ? freightRulesText(freightRules)
      : 'O frete é calculado pela distância até o local e aparece na proposta.';
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
    // O23: com item indisponível, o pedido não segue; o aviso diz qual.
    if (unavailableNames.length > 0) {
      addNotification({
        type: 'warning',
        title: 'Item indisponível',
        message: `Tire do carrinho para seguir: ${unavailableNames.join(', ')}.`,
        duration: 5000,
      });
      return;
    }
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

        {unavailableNames.length > 0 && (
          <Alert variant="warning" className="mb-6">
            {unavailableNames.length === 1 ? 'Este item não está disponível agora' : 'Estes itens não estão disponíveis agora'}:{' '}
            <strong>{unavailableNames.join(', ')}</strong>. Tire do carrinho para seguir com o pedido.
          </Alert>
        )}

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
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge variant={itemTypeBadge[item.type].variant} size="sm">
                      {itemTypeBadge[item.type].label}
                    </Badge>
                    {!item.available && (
                      <Badge variant="destructive" size="sm">
                        Indisponível no momento
                      </Badge>
                    )}
                  </div>
                  <h2 className="mb-1 break-words text-lg font-bold text-foreground sm:text-2xl">{item.name}</h2>
                  <p className="text-lg font-bold text-primary sm:text-xl">
                    {item.includedInKit ? 'Incluso no kit' : formatPrice(item.price)}{' '}
                    {/* Decisão do dono de 06/11: kit por evento; equipamento avulso por hora ou por diária (EQUIPMENT_PRICE_UNIT). */}
                    {!item.includedInKit && <span className="text-sm font-normal text-muted-foreground">{item.unitLabel}</span>}
                  </p>
                  {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
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
                Este valor é uma estimativa parcial. Kits têm preço por evento, com hora extra quando o evento passa das horas incluídas no kit; equipamentos avulsos são {equipmentUnit === 'day' ? 'cobrados por diária (cada 24 horas do evento, com o mínimo de diárias de cada um)' : 'multiplicados pela duração do seu evento'}. As horas do evento entram no pedido de orçamento.{freightSentence ? ` ${freightSentence}` : ''}
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
