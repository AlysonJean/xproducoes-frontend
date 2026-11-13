import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, User, Package, Shield, Zap, Truck, Store } from 'lucide-react';
import { TrustBenefits } from '../components/ui/TrustBenefits';
import ReactGA from 'react-ga4';
import { apiFetch } from '../services/api';
import { useCart } from '@/hooks/useCart';
import { useNotifications } from '../contexts/NotificationContext';
import BrandLoader from '@/components/ui/BrandLoader';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import CompareButton from '../components/ui/CompareButton';
import { formatPrice } from '../utils/typeSafeFormatters';
import { toNumber, calculateSavingsAmount } from '../utils/typeSafeFormatters';
import type { Kit, Equipment } from '../types/types';
import { SEO } from '../components/SEO';
import { transformKit } from '../utils/transformKit';
import { KIT_FULFILLMENT_LABEL, kitFulfillment, kitHours, kitPageSentence } from '../utils/kitInfo';
import { RecommendationSection } from '../components/ui/RecommendationSection';
import { useRecommendations } from '../hooks/useRecommendations';
import { useEquipmentUnitOf } from '../hooks/usePricingRules';
import { equipmentUnitSuffix, priceUnitOf } from '../utils/bookingPricing';
import { PageLayout, PageError } from '../components/layouts/PageLayout';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { ZoomableProductPhoto } from '@/components/ui/ZoomableProductPhoto';
import { AskOnWhatsAppButton } from '@/components/ui/AskOnWhatsAppButton';
import { Badge, Button, buttonVariants } from '../components/ui/StandardComponents';
import { fetchStructureCatalog, kitEquipmentIds, structureOffers, STRUCTURE_LIGHTING_HINT, STRUCTURE_PRICE_NOTE } from '../utils/cartCatalog';

const LIST_CRUMB = { label: 'Kits', path: '/kits' };

const sideArrowClass =
  'fixed top-1/2 -translate-y-1/2 bg-background/80 hover:bg-primary hover:text-primary-foreground p-3 rounded-full shadow-lg border border-border backdrop-blur-sm transition-all z-50 hidden lg:flex items-center justify-center group text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const compactArrowClass =
  'p-2.5 bg-muted/80 backdrop-blur-sm rounded-full border border-border shadow-sm active:scale-95 transition-all text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export const KitDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, cart } = useCart();
  const { addNotification } = useNotifications();
  const [kit, setKit] = useState<(Kit & { prevSlug?: string | null; nextSlug?: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // Palco (13/11/2026): as estruturas do catálogo, que o kit de entrega oferece à parte (o kit de retirada, não).
  const [structureCatalog, setStructureCatalog] = useState<Equipment[]>([]);
  const [addingStructureId, setAddingStructureId] = useState<string | null>(null);
  const isDeliveryKit = !!kit && kitFulfillment(kit) === 'DELIVERY_SETUP';

  // Recommendations hooks
  const similarRecommendations = useRecommendations({
    type: 'similar',
    itemId: slug || '',
    itemType: 'kit',
    limit: 4,
    autoFetch: !!slug
  });

  const frequentlyBoughtRecommendations = useRecommendations({
    type: 'frequently-bought',
    itemId: slug || '',
    itemType: 'kit',
    limit: 4,
    autoFetch: !!slug
  });

  useEffect(() => {
    if (!slug) return;
    const fetchKit = async () => {
      try {
        setLoading(true);
        setKit(null); // Reset before fetch to clear old data
        const data = await apiFetch<Kit & { prevSlug?: string | null; nextSlug?: string | null }>(`/kits/${slug}`);
        const transformed = transformKit(data);
        setKit({
            ...transformed,
            prevSlug: data.prevSlug,
            nextSlug: data.nextSlug
        });

        if (data) {
          ReactGA.event({
            category: "ecommerce",
            action: "view_item",
            label: `Kit: ${(data as Kit).name}`,
            value: Number((data as Kit).price || 0)
          });
        }
      } catch {
        setError('Não foi possível carregar os detalhes do kit.');
      } finally {
        setLoading(false);
      }
    };
    fetchKit();
  }, [slug]);

  useEffect(() => {
    if (!isDeliveryKit) return;
    let alive = true;
    Promise.resolve()
      .then(() => fetchStructureCatalog(apiFetch))
      .then((list) => {
        if (alive && list) setStructureCatalog(list);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [isDeliveryKit]);

  // Diária (lote 13): o preço de cada equipamento do kit diz a unidade que o servidor cobra no avulso (o
  // priceUnit que vem com o equipamento do kit; sem ele, a chave do servidor). O preço do kit é por evento.
  const kitEquipment = kit?.items?.find((item) => item.equipment)?.equipment;
  const kitEquipmentUnit = useEquipmentUnitOf(kitEquipment, !!kitEquipment);

  // Achado: o loading usava PageLayout title="Carregando..." — como o useEffect não roda no SSR,
  // era esse o <h1>/<title> entregue a crawlers.
  if (loading) {
    return (
      <PageLayout title="Kits" hideTitle breadcrumbs={[LIST_CRUMB]}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando kit..." />
        </div>
      </PageLayout>
    );
  }

  if (error || !kit) {
    return (
      <PageLayout title={error ? 'Erro ao carregar o kit' : 'Kit não encontrado'} breadcrumbs={[LIST_CRUMB]}>
        <PageError
          title="Não foi possível abrir este kit"
          message={error || 'O kit que você procura não existe ou foi removido.'}
        />
        <div className="text-center">
          <Link to="/kits" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Voltar para kits
          </Link>
        </div>
      </PageLayout>
    );
  }

  const totalItemsPrice = (kit.items || []).reduce((sum, item) => {
    const price = item.equipment?.pricePerHour || item.service?.price || 0;
    return sum + (toNumber(price) * (item.quantity || 1));
  }, 0);
  const savings = calculateSavingsAmount(totalItemsPrice, kit.price ?? 0);
  const isKitInCart = !!(cart?.kit && cart.kit.id === kit.id);
  // Conferência de 08/11/2026: o kit inativo abre pelo link direto (decisão do dono), e o botão seguia ativo; o
  // pedido entrava. Como na página do serviço, só o kit ATIVO entra no orçamento (o servidor também recusa).
  const canAdd = !kit.status || kit.status === 'ACTIVE';
  const fulfillment = kitFulfillment(kit);
  const { included: includedHours, extraHourPrice } = kitHours(kit);
  // Palco (13/11/2026): o item que o kit já traz não aparece; o que já está no carrinho fica marcado.
  const structures = isDeliveryKit ? structureOffers(structureCatalog, kitEquipmentIds(kit) ?? []) : [];
  const cartEquipmentIds = new Set(
    ((cart?.equipments ?? []) as Array<Equipment | { equipmentId: string }>).map((e) => ('equipmentId' in e ? e.equipmentId : e.id)),
  );

  const handleAddToCart = async () => {
    if (!kit || !canAdd) return;
    setAdding(true);
    try {
      // Auditoria do orçamento (12/11/2026), O23/O24: addItem devolve false (e já avisou) quando o item não entra:
      // repetido, indisponível ou kit mantido no modal de troca. O aviso de sucesso só sai quando entrou.
      if (!(await addItem(kit, 'kit'))) return;
      addNotification({
          type: 'success',
          title: 'Combo Adicionado',
          // Auditoria do orçamento (12/11/2026), O4: sem "com desconto" (o kit entra pelo preço do evento).
          message: `${kit.name} foi incluído no seu orçamento.`
      });
    } catch (e: unknown) {
      addNotification({
          type: 'error',
          title: 'Erro',
          message: e instanceof Error ? e.message : 'Não foi possível adicionar o kit.'
      });
    } finally {
      setAdding(false);
    }
  };

  // Palco (13/11/2026): cada estrutura entra como equipamento avulso. O addItem do carrinho confere item ativo e
  // repetido e já avisa, inclusive o erro.
  const handleAddStructure = async (structure: Equipment) => {
    setAddingStructureId(structure.id);
    try {
      await addItem(structure, 'equipment');
    } catch {
      // O carrinho já mostrou o erro.
    } finally {
      setAddingStructureId(null);
    }
  };

  // Achado: o JSON-LD trazia um aggregateRating fixo ("5.0", 12 avaliações) que não vinha de
  // dado nenhum — removido (avaliação inventada em dado estruturado viola as regras do Google).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": kit.name,
    "image": [
      kit.imageUrl || "https://www.xproducoeseeventos.com.br/xproducoes-logo.png"
    ],
    "description": kit.description || `Aluguel de ${kit.name} em Belo Horizonte. Kit completo para festas e eventos.`,
    "sku": kit.id,
    "brand": {
      "@type": "Brand",
      "name": "X Produções"
    },
    "offers": {
      "@type": "Offer",
      "url": typeof window !== 'undefined' ? `${window.location.origin}/kits/${kit.slug || kit.id}` : `https://www.xproducoeseeventos.com.br/kits/${kit.slug || kit.id}`,
      "priceCurrency": "BRL",
      "price": kit.price || 0,
      "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      "availability": kit.isActive ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "X Produções"
      }
    }
  };

  // Agrupamento de itens por categoria
  const groupedItems = (kit.items || []).reduce((acc, item) => {
    const entity = item.equipment || item.service;
    if (!entity) return acc;

    let categoryName = 'Outros Equipamentos';

    if (item.service) {
        categoryName = 'Serviços Inclusos';
    } else if (item.equipment) {
        if (typeof item.equipment.category === 'object' && item.equipment.category?.name) {
            categoryName = item.equipment.category.name;
        } else if (typeof item.equipment.category === 'string' && item.equipment.category) {
            categoryName = item.equipment.category;
        }
    }

    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(item);
    return acc;
  }, {} as Record<string, typeof kit.items>);

  const categoryNames = Object.keys(groupedItems).sort((a, b) => {
     // 'Serviços Inclusos' e 'Outros Equipamentos' no final
     if (a === 'Serviços Inclusos') return 1;
     if (b === 'Serviços Inclusos') return -1;
     if (a === 'Outros Equipamentos') return 1;
     if (b === 'Outros Equipamentos') return -1;
     return a.localeCompare(b);
  });

  return (
    <PageLayout title={kit.name} hideTitle breadcrumbs={[LIST_CRUMB, { label: kit.name }]}>
      <SEO
        title={kit.name}
        description={kit.description || `Aluguel de ${kit.name} em Belo Horizonte. Kit completo para festas e eventos.`}
        image={kit.imageUrl}
        jsonLd={jsonLd}
        noindex={kit.status === 'INACTIVE'}
      />

      {/* Mesmo cartão das páginas de equipamento e serviço (antes: card-glass translúcido). */}
      <div className="bg-card p-6 md:p-8 rounded-2xl shadow-2xl border border-border">
        {/* Setas laterais (desktop) */}
        {kit.prevSlug && (
          <Link to={`/kits/${kit.prevSlug}`} className={`${sideArrowClass} left-4`} aria-label="Kit anterior" title="Kit anterior">
            <ChevronLeft className="w-8 h-8 group-hover:-translate-x-0.5 transition-transform" aria-hidden="true" />
          </Link>
        )}
        {kit.nextSlug && (
          <Link to={`/kits/${kit.nextSlug}`} className={`${sideArrowClass} right-4`} aria-label="Próximo kit" title="Próximo kit">
            <ChevronRight className="w-8 h-8 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </Link>
        )}

        {/* Setas compactas (celular/tablet) */}
        {(kit.prevSlug || kit.nextSlug) && (
          <div className="flex lg:hidden justify-end gap-3 mb-6">
            {kit.prevSlug && (
              <Link to={`/kits/${kit.prevSlug}`} className={compactArrowClass} aria-label="Kit anterior">
                <ChevronLeft className="w-6 h-6" aria-hidden="true" />
              </Link>
            )}
            {kit.nextSlug && (
              <Link to={`/kits/${kit.nextSlug}`} className={compactArrowClass} aria-label="Próximo kit">
                <ChevronRight className="w-6 h-6" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative mb-12">
          {/* Imagem */}
          <div className="relative">
            {kit.imageUrl ? (
              <ZoomableProductPhoto src={kit.imageUrl} alt={kit.name} extraImages={kit.images} />
            ) : (
              <div className="w-full aspect-[4/3] rounded-xl border border-border bg-muted flex items-center justify-center" role="img" aria-label={`${kit.name} (sem foto)`}>
                <Package className="w-16 h-16 text-muted-foreground" aria-hidden="true" />
              </div>
            )}
            {savings > 0 && (
              <div className="absolute top-4 left-4 bg-success text-success-foreground px-4 py-1.5 rounded-full text-sm font-black shadow-lg">
                ECONOMIZE {formatPrice(savings)}
              </div>
            )}
            {/* Ações sempre visíveis abaixo de lg (antes só no hover); no desktop ficam ao lado do título. */}
            <div className="absolute top-4 right-4 flex lg:hidden flex-col gap-2">
              <FavoriteButton equipmentId={kit.id} equipmentName={kit.name} size="lg" />
              <CompareButton equipment={{...kit, pricePerHour: kit.price} as unknown as Equipment} size="lg" itemType="kit" />
            </div>
          </div>

          {/* Informações */}
          <div className="flex flex-col">
            <div className="flex justify-between items-start gap-4 mb-4">
              <h1 className="text-4xl lg:text-5xl font-bold text-primary leading-tight">
                  {kit.name}
              </h1>
              <div className="hidden lg:flex space-x-2">
                  <FavoriteButton equipmentId={kit.id} equipmentName={kit.name} size="lg" />
                  <CompareButton equipment={{...kit, pricePerHour: kit.price} as unknown as Equipment} size="lg" itemType="kit" />
              </div>
            </div>

            <p className="text-muted-foreground text-lg mb-8 leading-relaxed whitespace-pre-wrap">
              {kit.description}
            </p>

            <div className="bg-muted/30 p-6 rounded-2xl mb-8 border border-border shadow-inner">
              <div className="flex flex-wrap justify-between items-baseline gap-2 mb-4">
                <span className="text-muted-foreground font-semibold">Valor da Locação</span>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground line-through">
                      {formatPrice(totalItemsPrice)}
                  </div>
                  <div className="text-4xl font-black text-foreground">
                      {formatPrice(Number(kit.price ?? 0))}
                      {/* Decisão do dono de 06/11: o preço do kit é por evento, nunca vezes as horas. */}
                      <span className="text-sm font-normal ml-1">por evento</span>
                  </div>
                  {/* Lote 13 (06/11/2026): as horas que o preço cobre e o valor da hora extra, como a conta da reserva. */}
                  {includedHours && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {includedHours} h incluídas no preço{extraHourPrice ? ` · hora extra: ${formatPrice(extraHourPrice)}` : ''}
                    </p>
                  )}
                </div>
              </div>

              {savings > 0 && (
                  <div className="flex flex-wrap justify-between items-center gap-2 text-success font-bold bg-success/10 p-3 rounded-xl border border-success/20">
                      <span>Sua economia imediata:</span>
                      <span>{formatPrice(savings)}</span>
                  </div>
              )}
            </div>

            {/* Lote 13 (aprovado pelo dono em 06/11/2026): cada kit é de um tipo só, dito numa frase simples. Auditoria do
                orçamento (12/11/2026), E1/E4: a frase segue a composição do kit (técnico incluso ou à parte) e diz o
                frete da entrega. */}
            <div className="mb-8 flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
              {fulfillment === 'CLIENT_PICKUP'
                ? <Store className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                : <Truck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />}
              <div>
                <p className="font-semibold text-foreground">{KIT_FULFILLMENT_LABEL[fulfillment]}</p>
                <p className="text-sm text-muted-foreground">{kitPageSentence(kit)}</p>
              </div>
            </div>

            {/* Auditoria do orçamento (12/11/2026), O4/B1: saiu o seletor Silver/Gold/Platinum. Ele mostrava preço e
                itens próprios, mas o pedido levava o kit pelo preço base. Decisão de 12/11: cada tamanho de festa é um
                kit; os extras são serviços do catálogo e hora extra. */}
            <Button
              size="xl"
              fullWidth
              onClick={handleAddToCart}
              isLoading={adding}
              disabled={isKitInCart || !canAdd}
            >
              {adding ? 'Adicionando...' : isKitInCart ? 'Kit já no orçamento' : canAdd ? 'Adicionar combo ao orçamento' : 'Indisponível no momento'}
            </Button>
            <div className="mt-3">
              <AskOnWhatsAppButton kind="Kit" itemName={kit.name} />
            </div>
          </div>
        </div>

        {/* Benefícios */}
        <TrustBenefits
          items={[
            { icon: Package, iconColor: 'success', title: 'Kit Completo e Testado', description: `Todos os itens do combo revisados e configurados juntos antes da ${fulfillment === 'CLIENT_PICKUP' ? 'retirada' : 'entrega'}.` },
            // P20 (decisão do dono de 08/11/2026): sem promessa absoluta ("Compatibilidade Garantida").
            { icon: Shield, iconColor: 'info', title: 'Testado em Conjunto', description: 'Os equipamentos do kit são testados juntos antes de sair para o evento.' },
            // Lote 13: o kit de retirada não tem entrega; o benefício fala da retirada. Decisão do dono de 08/11/2026:
            // o "Entrega Ágil" prometia o material "sempre no horário"; o kit de entrega fala do horário combinado.
            fulfillment === 'CLIENT_PICKUP'
              ? { icon: Zap, iconColor: 'primary', title: 'Retirada Combinada', description: 'Você busca o kit pronto para usar, no horário combinado com a equipe.' }
              : { icon: Zap, iconColor: 'primary', title: 'Entrega no Horário Combinado', description: 'A equipe leva e monta o kit no horário combinado, antes do evento.' },
          ]}
        />

        {/* Itens incluídos, agrupados por categoria */}
        <div className="border-t border-border pt-12">
          <div className="flex flex-wrap items-center gap-3 mb-8">
              <h2 className="text-3xl font-black text-foreground">O que vem no Kit?</h2>
              <Badge variant="ghost" size="lg">
                  {kit.equipments?.length || kit.items?.length || 0} Itens
              </Badge>
          </div>

          <div className="space-y-10">
            {categoryNames.map(categoryName => (
              <div key={categoryName} className="space-y-4">
                <h3 className="text-xl font-bold text-primary border-l-4 border-primary pl-3 flex items-center">
                  {categoryName}
                  <Badge variant="ghost" size="sm" className="ml-2 font-normal">
                    {groupedItems[categoryName].length}
                  </Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedItems[categoryName].map((item) => {
                    const entity = item.equipment || item.service;
                    if (!entity) return null;
                    const isService = !!item.serviceId;
                    const price = item.equipment?.pricePerHour ?? item.service?.price;

                    return (
                      <div key={item.id} className="group bg-muted/10 rounded-2xl p-5 hover:bg-muted/20 transition-all border border-border hover:border-primary/20 shadow-sm hover:shadow-md">
                        <div className="flex items-center space-x-5">
                          <div className="w-20 h-20 rounded-xl overflow-hidden shadow-inner flex-shrink-0 bg-card flex items-center justify-center relative">
                              {entity.imageUrl ? (
                                <OptimizedImage
                                  src={entity.imageUrl}
                                  alt={entity.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                              ) : (
                                isService
                                  ? <User className="w-10 h-10 text-success" aria-hidden="true" />
                                  : <Package className="w-10 h-10 text-info" aria-hidden="true" />
                              )}
                              {item.quantity > 1 && (
                                 <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-bl-lg">
                                   {item.quantity}x
                                 </div>
                              )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`w-2 h-2 rounded-full ${isService ? 'bg-success' : 'bg-info'}`} aria-hidden="true" />
                              <h4 className="font-bold text-foreground text-sm truncate uppercase tracking-tight" title={entity.name}>{entity.name}</h4>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-primary font-bold text-sm">
                                {formatPrice(Number(price))}{isService ? '/serviço' : equipmentUnitSuffix(priceUnitOf(item.equipment) ?? kitEquipmentUnit)}
                              </span>
                              <Link
                                to={isService ? `/servicos/${entity.slug || entity.id}` : `/equipamentos/${entity.slug || entity.id}`}
                                className="text-xs font-bold text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors uppercase tracking-widest"
                                aria-label={`Detalhes de ${entity.name}`}
                              >
                                Detalhes
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Palco (13/11/2026): os Kits 06 e 08 deixam de trazer o palco, vendido à parte. No kit de entrega, os itens
            ativos da categoria "Estruturas" do catálogo, cada um com o preço da diária e o botão do orçamento. O nome
            acessível do botão começa pelo texto que aparece nele (quem usa comando de voz diz o que vê). */}
        {structures.length > 0 && (
          <section className="mt-12 pt-12 border-t border-border" aria-labelledby="palco-ou-estrutura">
            <h2 id="palco-ou-estrutura" className="text-3xl font-black text-foreground mb-4">Vai precisar de palco ou estrutura?</h2>
            <p className="text-muted-foreground mb-2">{STRUCTURE_PRICE_NOTE} Entram no orçamento à parte do kit.</p>
            <p className="text-sm font-semibold text-foreground mb-8">{STRUCTURE_LIGHTING_HINT}</p>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {structures.map((structure) => {
                const inCart = cartEquipmentIds.has(structure.id);
                return (
                  <li key={structure.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/10 p-5 shadow-sm">
                    <h3 className="font-bold text-foreground">{structure.name}</h3>
                    <p className="text-sm font-bold text-primary">
                      {formatPrice(Number(structure.pricePerHour))}{equipmentUnitSuffix(priceUnitOf(structure) ?? kitEquipmentUnit)}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                      <Link
                        to={`/equipamentos/${structure.slug || structure.id}`}
                        className="text-xs font-bold text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors uppercase tracking-widest"
                        aria-label={`Detalhes de ${structure.name}`}
                      >
                        Detalhes
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddStructure(structure)}
                        isLoading={addingStructureId === structure.id}
                        disabled={inCart}
                        aria-label={inCart ? `No orçamento: ${structure.name}` : `Adicionar ao orçamento: ${structure.name}`}
                      >
                        {inCart ? 'No orçamento' : 'Adicionar ao orçamento'}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Achado: aqui havia uma 2ª grade de benefícios (com azul fixo) repetindo o TrustBenefits
            logo acima — removida. */}

        {/* Recomendações */}
        {similarRecommendations.recommendations.length > 0 && (
          <div className="mt-12 pt-12 border-t border-border">
            <RecommendationSection
              type="similar"
              title="Kits Similares"
              items={similarRecommendations.recommendations}
              maxItems={4}
              loading={similarRecommendations.loading}
              viewAllLink="/kits"
              viewAllText="Ver Mais Kits"
              columns={{ sm: 1, md: 2, lg: 4 }}
            />
          </div>
        )}

        {frequentlyBoughtRecommendations.recommendations.length > 0 && (
          <div className="mt-8">
            <RecommendationSection
              type="frequently-bought"
              title="Eventos Similares usaram estes Combos"
              items={frequentlyBoughtRecommendations.recommendations}
              maxItems={4}
              loading={frequentlyBoughtRecommendations.loading}
              viewAllLink="/kits"
              viewAllText="Explorar Mais"
              columns={{ sm: 1, md: 2, lg: 4 }}
            />
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default KitDetailPage;
