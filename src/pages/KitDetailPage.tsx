import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, User, Package } from 'lucide-react';
import ReactGA from 'react-ga4';
import { apiFetch } from '../services/api';
import { useCart } from '@/hooks/useCart';
import { useNotifications } from '../contexts/NotificationContext';
import BrandLoader from '@/components/ui/BrandLoader';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import CompareButton from '../components/ui/CompareButton';
import { formatPrice } from '../utils/typeSafeFormatters';
import { toNumber, calculateSavingsAmount } from '../utils/typeSafeFormatters';
import type { Kit, ExperienceLevel } from '../types/types';
import { SEO } from '../components/SEO';
import { transformKit } from '../utils/transformKit';
import { ExperienceLevelSelector } from '../components/kits/ExperienceLevelSelector';
import { RecommendationSection } from '../components/ui/RecommendationSection';
import { useRecommendations } from '../hooks/useRecommendations';
import { PageLayout } from '../components/layouts/PageLayout';
// import { Skeleton } from '../components/ui/StandardComponents';

export const KitDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, cart } = useCart();
  const { addNotification } = useNotifications();
  const [kit, setKit] = useState<(Kit & { prevSlug?: string | null; nextSlug?: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel | null>(null);
  
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
        const data = await apiFetch(`/kits/${slug}`);
        const transformed = transformKit(data as Kit);
        setKit({
            ...transformed,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            prevSlug: (data as any).prevSlug,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nextSlug: (data as any).nextSlug
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

  if (loading) {
    return (
      <PageLayout title="Carregando..." description="Preparando o melhor kit para você.">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Preparando kit..." />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg text-center my-10 max-w-2xl mx-auto">
        {error}
      </div>
    );
  }

  if (!kit) {
    return (
      <div className="text-muted-foreground text-center py-20">Kit não encontrado.</div>
    );
  }

  const totalItemsPrice = (kit.items || []).reduce((sum, item) => {
    const price = item.equipment?.pricePerHour || item.service?.price || 0;
    return sum + (toNumber(price) * (item.quantity || 1));
  }, 0);
  const savings = calculateSavingsAmount(totalItemsPrice, kit.price ?? 0);

  const handleAddToCart = async () => {
    if (!kit) return;
    setAdding(true);
    try {
      await addItem(kit, 'kit');
      addNotification({ 
          type: 'success', 
          title: 'Combo Adicionado', 
          message: `${kit.name} foi incluído no seu orçamento com desconto.` 
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      addNotification({ 
          type: 'error', 
          title: 'Erro', 
          message: e.message || 'Não foi possível adicionar o kit.' 
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="bg-card p-6 md:p-8 rounded-lg shadow-2xl border border-border">
      <SEO 
        title={kit.name}
        description={kit.description || `Aluguel de ${kit.name} em Belo Horizonte. Kit completo para festas e eventos.`}
        image={kit.imageUrl}
      />

      {/* Navigation Arrows (Fixed sides for consistency) */}
      {kit.prevSlug && (
        <Link
          to={`/kits/${kit.prevSlug}`}
          className="fixed left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-primary hover:text-primary-foreground p-3 rounded-full shadow-lg border border-border backdrop-blur-sm transition-all z-50 hidden lg:flex items-center justify-center group text-foreground"
          title="Kit Anterior"
        >
          <ChevronLeft className="w-8 h-8 group-hover:-translate-x-0.5 transition-transform" />
        </Link>
      )}
      {kit.nextSlug && (
        <Link
          to={`/kits/${kit.nextSlug}`}
          className="fixed right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-primary hover:text-primary-foreground p-3 rounded-full shadow-lg border border-border backdrop-blur-sm transition-all z-50 hidden lg:flex items-center justify-center group text-foreground"
          title="Próximo Kit"
        >
          <ChevronRight className="w-8 h-8 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Breadcrumb & Navigation */}
      <div className="flex justify-between items-center mb-6 lg:mb-8">
        <nav className="text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">Início</Link>
            <span className="mx-2 text-border">&gt;</span>
            <Link to="/kits" className="hover:text-primary transition-colors">Kits</Link>
            <span className="mx-2 text-border">&gt;</span>
            <span className="text-primary font-medium">{kit.name}</span>
        </nav>
        
        <div className="flex lg:hidden gap-3">
            {kit.prevSlug && (
                <Link to={`/kits/${kit.prevSlug}`} className="p-2.5 bg-muted/80 backdrop-blur-sm rounded-full border border-border shadow-sm active:scale-95 transition-all">
                    <ChevronLeft className="w-6 h-6 text-primary" />
                </Link>
            )}
            {kit.nextSlug && (
                <Link to={`/kits/${kit.nextSlug}`} className="p-2.5 bg-muted/80 backdrop-blur-sm rounded-full border border-border shadow-sm active:scale-95 transition-all">
                    <ChevronRight className="w-6 h-6 text-primary" />
                </Link>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative mb-12">
        {/* Kit Image Section */}
        <div className="relative group">
          <img
            src={
              kit.imageUrl ||
              `https://placehold.co/800x600/1a202c/ffffff?text=${kit.name.replace(/\s/g, '+')}`
            }
            alt={kit.name}
            className="w-full h-auto rounded-xl object-cover shadow-lg border border-border"
          />
          {savings > 0 && (
            <div className="absolute top-4 left-4 bg-success text-success-foreground px-4 py-1.5 rounded-full text-sm font-black shadow-lg">
              ECONOMIZE {formatPrice(savings)}/h
            </div>
          )}
          <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <FavoriteButton equipmentId={kit.id} equipmentName={kit.name} size="lg" />
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <CompareButton equipment={{...kit, pricePerHour: kit.price} as any} size="lg" />
          </div>
        </div>

        {/* Kit Info Section */}
        <div className="flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-4xl lg:text-5xl font-bold text-primary heading-elegant leading-tight">
                {kit.name}
            </h1>
            <div className="hidden lg:flex space-x-2">
                <FavoriteButton equipmentId={kit.id} equipmentName={kit.name} size="lg" />
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <CompareButton equipment={{...kit, pricePerHour: kit.price} as any} size="lg" />
            </div>
          </div>

          <p className="text-muted-foreground text-lg mb-8 leading-relaxed whitespace-pre-wrap">
            {kit.description}
          </p>

          <div className="bg-muted/30 p-6 rounded-2xl mb-8 border border-border shadow-inner">
            <div className="flex justify-between items-baseline mb-4">
              <span className="text-muted-foreground font-semibold">Valor Especial do Kit</span>
              <div className="text-right">
                <div className="text-sm text-muted-foreground line-through opacity-60">
                    {formatPrice(totalItemsPrice)}
                </div>
                <div className="text-4xl font-black text-foreground">
                    {formatPrice(Number(kit.price ?? 0))}
                    <span className="text-sm font-normal ml-1">/ hora</span>
                </div>
              </div>
            </div>
            
            {savings > 0 && (
                <div className="flex justify-between items-center text-success font-bold bg-success/5 p-3 rounded-xl border border-success/10">
                    <span>Sua economia imediata:</span>
                    <span>{formatPrice(savings)} / hora</span>
                </div>
            )}
          </div>

          {/* Level Selector if applicable */}
          {kit.experienceLevels && kit.experienceLevels.length > 0 && (
            <div className="mb-8 p-4 bg-muted/20 rounded-xl border border-border/50">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Configuração do Kit</h3>
              <ExperienceLevelSelector
                levels={kit.experienceLevels}
                selected={selectedLevel}
                onSelect={setSelectedLevel}
                basePrice={kit.experienceLevels.find(l => l.level === 'SILVER')?.price}
              />
            </div>
          )}

          <button
            onClick={handleAddToCart}
            className="w-full bg-primary hover:bg-primary text-primary-foreground font-black py-5 px-8 rounded-2xl transition-all duration-300 transform shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 text-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={adding || (cart?.kit && cart.kit.id === kit.id)}
          >
            {adding ? 'ADICIONANDO...' : (cart?.kit && cart.kit.id === kit.id ? 'KIT JÁ NO ORÇAMENTO' : 'ADICIONAR COMBO AO ORÇAMENTO')}
          </button>
        </div>
      </div>

      {/* Included Equipments Grid - Grouped by Category */}
      <div className="border-t border-border pt-12">
        <div className="flex items-center gap-3 mb-8">
            <h2 className="text-3xl font-black text-foreground">O que vem no Kit?</h2>
            <span className="bg-muted px-3 py-1 rounded-lg text-sm font-bold text-muted-foreground">
                {kit.equipments?.length || kit.items?.length || 0} Itens
            </span>
        </div>
        
        {(() => {
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
             // 'Serviços Inclusos' e 'Outros Equipamentos'  no final
             if (a === 'Serviços Inclusos') return 1;
             if (b === 'Serviços Inclusos') return -1;
             if (a === 'Outros Equipamentos') return 1;
             if (b === 'Outros Equipamentos') return -1;
             return a.localeCompare(b);
          });

          return (
            <div className="space-y-10">
              {categoryNames.map(categoryName => (
                <div key={categoryName} className="space-y-4">
                  <h3 className="text-xl font-bold text-primary border-l-4 border-primary pl-3 flex items-center">
                    {categoryName}
                    <span className="ml-2 text-xs font-normal text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                      {groupedItems[categoryName].length}
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedItems[categoryName].map((item) => {
                      const entity = item.equipment || item.service;
                      if (!entity) return null;
                      const isService = !!item.serviceId;
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const price = isService ? (entity as any).price : (entity as any).pricePerHour;

                      return (
                        <div key={item.id} className="group bg-muted/10 rounded-2xl p-5 hover:bg-muted/20 transition-all border border-border hover:border-primary/20 shadow-sm hover:shadow-md">
                          <div className="flex items-center space-x-5">
                            <div className="w-20 h-20 rounded-xl overflow-hidden shadow-inner flex-shrink-0 bg-card flex items-center justify-center relative">
                                {entity.imageUrl ? (
                                  <img
                                    src={entity.imageUrl}
                                    alt={entity.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                  />
                                ) : (
                                  isService ? <User className="w-10 h-10 text-emerald-400" /> : <Package className="w-10 h-10 text-blue-400" />
                                )}
                                {item.quantity > 1 && (
                                   <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-bl-lg">
                                     {item.quantity}x
                                   </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`w-2 h-2 rounded-full ${isService ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                <h3 className="font-bold text-foreground text-sm truncate uppercase tracking-tight" title={entity.name}>{entity.name}</h3>
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-primary font-bold text-sm">
                                  {formatPrice(Number(price))}{isService ? '/serviço' : '/h'}
                                </span>
                                <Link 
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  to={isService ? `/servicos/${(entity as any).slug}` : `/equipamentos/${(entity as any).slug || entity.id}`} 
                                  className="text-[10px] font-bold text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors uppercase tracking-widest"
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
          );
        })()}
      </div>

      {/* Benefits Grid (Premium styling) */}
      <div className="mt-16 bg-muted/10 -mx-6 md:-mx-8 p-12 rounded-b-lg border-t border-border grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-success/10 rounded-3xl flex items-center justify-center border border-success/20 shadow-xl shadow-success/5 rotate-3">
              <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-foreground">Economia Mínima 15%</h3>
            <p className="text-muted-foreground text-sm max-w-[200px]">Garantimos um valor inferior à soma das peças individuais.</p>
          </div>

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center border border-blue-500/20 shadow-xl shadow-blue-500/5 -rotate-3">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-foreground">Compatibilidade Total</h3>
            <p className="text-muted-foreground text-sm max-w-[200px]">Curadoria técnica: cabos e acessórios testados para funcionar.</p>
          </div>

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/5 rotate-1">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-foreground">Montagem Rápida</h3>
            <p className="text-muted-foreground text-sm max-w-[200px]">Solução plug-and-play pensada para agilizar seu evento.</p>
          </div>
      </div>

      {/* Recommendations */}
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
  );
};

export default KitDetailPage;
