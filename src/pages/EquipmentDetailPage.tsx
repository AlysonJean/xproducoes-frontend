/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useRevealOnView } from '../hooks/useRevealOnView';
import { useParams, Link } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { ChevronLeft, ChevronRight, Package, Shield, Zap } from 'lucide-react';
import { apiFetch } from '../services/api';
import { useCart } from '@/hooks/useCart';
import BrandLoader from '../components/ui/BrandLoader';
import type { Equipment } from '../types/types';
import { formatPrice } from '../utils/typeSafeFormatters';
import { SEO } from '../components/SEO';
import { transformEquipment } from '../utils/transformEquipment';
import { RecommendationSection } from '../components/ui/RecommendationSection';
import { useRecommendations } from '../hooks/useRecommendations';
import { useNotifications } from '../contexts/NotificationContext';
import { generateProductSchema } from '../utils/schemaGenerator';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import CompareButton from '../components/ui/CompareButton';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

export const EquipmentDetailPage = () => {
  const { ref: titleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const { slug } = useParams<{ slug: string }>();
  const { addItem, cart } = useCart();
  const [equipment, setEquipment] = useState<(Equipment & { prevSlug?: string | null; nextSlug?: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [adding, setAdding] = useState(false);

  const similarRecommendations = useRecommendations({
    type: 'similar',
    itemId: slug || '',
    itemType: 'equipment',
    limit: 4,
    autoFetch: !!slug
  });

  const frequentlyBoughtRecommendations = useRecommendations({
    type: 'frequently-bought',
    itemId: slug || '',
    itemType: 'equipment',
    limit: 4,
    autoFetch: !!slug
  });

  const { addNotification } = useNotifications();

  useEffect(() => {
    if (!slug) return;
    const fetchEquipment = async () => {
      try {
        setLoading(true);
        setEquipment(null);
        const data = await apiFetch(`/equipments/${slug}`);
        const transformed = transformEquipment(data as Equipment);
        setEquipment({
          ...transformed,
          prevSlug: (data as any).prevSlug,
          nextSlug: (data as any).nextSlug
        });

        if (data) {
          ReactGA.event({
            category: "ecommerce",
            action: "view_item",
            label: (data as Equipment).name,
            value: Number((data as Equipment).pricePerHour || 0)
          });
        }
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Não foi possível carregar os detalhes do equipamento.');
      } finally {
        setLoading(false);
      }
    };
    fetchEquipment();
  }, [slug]);

  const handleAddToCart = async () => {
    if (!equipment) return;
    setAdding(true);
    try {
      // Add quantity logic if needed, but current addItem might not support it directly
      await addItem(equipment, 'equipment');
      addNotification({
        type: 'success',
        title: 'Adicionado ao Orçamento',
        message: `${equipment.name} foi adicionado ao seu carrinho.`
      });
        } catch (e: any) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: e.message || 'Não foi possível adicionar ao orçamento.'
      });
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-vh-[60vh] bg-background">
        <BrandLoader size={120} label="Carregando equipamento..." />
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="max-w-2xl mx-auto my-20 p-8 text-center bg-card border border-border rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-destructive mb-4">{error || 'Equipamento não encontrado'}</h2>
        <Link to="/equipamentos" className="text-primary hover:underline">Voltar para equipamentos</Link>
      </div>
    );
  }

    const isAlreadyInCart = cart?.equipments?.some((e: any) => {
    const id = e.id || e.equipmentId;
    return id === equipment.id;
  });

  // Generate the product schema using the centralized generator
  const productSchema = generateProductSchema({
    name: equipment.name,
    description: equipment.description || `Aluguel de ${equipment.name} em BH`,
    image: equipment.imageUrl || '',
    sku: equipment.id,
    price: equipment.pricePerHour,
    availability: equipment.isAvailable ? 'InStock' : 'OutOfStock'
  });

  return (
    <div className="bg-card p-6 md:p-8 rounded-lg shadow-2xl border border-border">
      <SEO
        title={equipment.name}
        description={equipment.description || `Aluguel de ${equipment.name} em Belo Horizonte. Equipamento profissional para eventos.`}
        image={equipment.imageUrl}
        jsonLd={productSchema as any}
      />
      
      {/* Navigation Arrows (Sidebar) */}
      {equipment.prevSlug && (
        <Link
          to={`/equipamentos/${equipment.prevSlug}`}
          className="fixed left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-primary hover:text-primary-foreground p-3 rounded-full shadow-lg border border-border backdrop-blur-sm transition-all z-50 hidden lg:flex items-center justify-center group text-foreground"
          title="Equipamento Anterior"
        >
          <ChevronLeft className="w-8 h-8 group-hover:-translate-x-0.5 transition-transform" />
        </Link>
      )}
      {equipment.nextSlug && (
        <Link
          to={`/equipamentos/${equipment.nextSlug}`}
          className="fixed right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-primary hover:text-primary-foreground p-3 rounded-full shadow-lg border border-border backdrop-blur-sm transition-all z-50 hidden lg:flex items-center justify-center group text-foreground"
          title="Próximo Equipamento"
        >
          <ChevronRight className="w-8 h-8 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Breadcrumb & Navigation */}
      <div className="flex justify-between items-center mb-6 lg:mb-8">
        <nav className="text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">Início</Link>
            <span className="mx-2 text-border">&gt;</span>
            <Link to="/equipamentos" className="hover:text-primary transition-colors">Equipamentos</Link>
            <span className="mx-2 text-border">&gt;</span>
            <span className="text-primary font-medium">{equipment.name}</span>
        </nav>
        
        <div className="flex lg:hidden gap-3">
            {equipment.prevSlug && (
                <Link to={`/equipamentos/${equipment.prevSlug}`} className="p-2.5 bg-muted/80 backdrop-blur-sm rounded-full border border-border shadow-sm active:scale-95 transition-all">
                    <ChevronLeft className="w-6 h-6 text-primary" />
                </Link>
            )}
            {equipment.nextSlug && (
                <Link to={`/equipamentos/${equipment.nextSlug}`} className="p-2.5 bg-muted/80 backdrop-blur-sm rounded-full border border-border shadow-sm active:scale-95 transition-all">
                    <ChevronRight className="w-6 h-6 text-primary" />
                </Link>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative mb-12">
        {/* Image Section */}
        <div className="relative group">
          <OptimizedImage
            src={equipment.imageUrl || `https://placehold.co/800x600/1a202c/ffffff?text=${equipment.name.replace(/\s/g, '+')}`}
            alt={equipment.name}
            priority={true}
            className="w-full h-auto rounded-xl object-cover shadow-lg border border-border"
          />
          <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <FavoriteButton equipmentId={equipment.id} equipmentName={equipment.name} size="lg" />
                        <CompareButton equipment={equipment as any} size="lg" itemType="equipment" />
          </div>
        </div>

        {/* Info Section */}
        <div className="flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <h1 ref={titleRef} className="text-4xl lg:text-5xl font-bold text-primary heading-elegant leading-tight">
                {equipment.name}
            </h1>
            <div className="hidden lg:flex space-x-2">
                <FavoriteButton equipmentId={equipment.id} equipmentName={equipment.name} size="lg" />
                                <CompareButton equipment={equipment as any} size="lg" itemType="equipment" />
            </div>
          </div>

          <p className="text-muted-foreground text-lg mb-8 leading-relaxed whitespace-pre-wrap">
            {equipment.description}
          </p>

          <div className="bg-muted/30 p-6 rounded-2xl mb-8 border border-border shadow-inner">
            <div className="flex justify-between items-baseline mb-4">
              <span className="text-muted-foreground font-semibold">Valor da Locação</span>
              <div className="text-right">
                <div className="text-4xl font-black text-foreground">
                    {formatPrice(Number(equipment.pricePerHour ?? 0))}
                    <span className="text-sm font-normal ml-1">/ hora</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Disponibilidade:</span>
              <span className={`font-bold ${
                equipment.status === 'MAINTENANCE' ? 'text-orange-500' : 
                equipment.status === 'COMING_SOON' ? 'text-blue-500' : 
                equipment.isAvailable ? 'text-success' : 'text-danger'
              }`}>
                {equipment.status === 'MAINTENANCE' ? 'Em Manutenção' : 
                 equipment.status === 'COMING_SOON' ? 'Em Breve' : 
                 equipment.isAvailable ? 'Disponível' : 'Indisponível'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 mb-8">
            <div className="flex flex-col gap-2">
                <label htmlFor="quantity" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quantidade</label>
                <div className="flex items-center bg-muted/50 rounded-xl border border-border p-1">
                    <button 
                        onClick={() => setQuantityToAdd(Math.max(1, quantityToAdd - 1))}
                        className="w-10 h-10 flex items-center justify-center hover:bg-background rounded-lg transition-colors text-foreground"
                    >
                        -
                    </button>
                    <input
                        type="number"
                        id="quantity"
                        min="1"
                        value={quantityToAdd}
                        onChange={(e) => setQuantityToAdd(Math.max(1, Number(e.target.value)))}
                        className="w-12 text-center bg-transparent font-bold focus:outline-none text-foreground"
                    />
                    <button 
                        onClick={() => setQuantityToAdd(quantityToAdd + 1)}
                        className="w-10 h-10 flex items-center justify-center hover:bg-background rounded-lg transition-colors text-foreground"
                    >
                        +
                    </button>
                </div>
            </div>
            
            <button
                onClick={handleAddToCart}
                disabled={adding || !equipment.isAvailable || isAlreadyInCart}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-black py-5 px-8 rounded-2xl transition-all duration-300 transform shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 text-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
                {adding ? 'ADICIONANDO...' : (isAlreadyInCart ? 'JÁ NO ORÇAMENTO' : 'ADICIONAR AO ORÇAMENTO')}
            </button>
          </div>
        </div>
      </div>

      {/* Benefits Section (Premium styling) */}
      <div className="mt-16 bg-muted/10 -mx-6 md:-mx-8 p-12 rounded-b-lg border-t border-border grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-success/10 rounded-3xl flex items-center justify-center border border-success/20 shadow-xl shadow-success/5 rotate-3">
              <Shield className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-xl font-black text-foreground">Equipamento Revisado</h3>
            <p className="text-muted-foreground text-sm max-w-[200px]">Testados rigorosamente antes de cada entrega para garantir zero falhas.</p>
          </div>

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center border border-blue-500/20 shadow-xl shadow-blue-500/5 -rotate-3">
              <Package className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-black text-foreground">Suporte Especializado</h3>
            <p className="text-muted-foreground text-sm max-w-[200px]">Nossa equipe técnica disponível para auxiliar na configuração se necessário.</p>
          </div>

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/5 rotate-1">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-black text-foreground">Entrega Ágil</h3>
            <p className="text-muted-foreground text-sm max-w-[200px]">Logística otimizada para garantir que o material chegue sempre no horário.</p>
          </div>
      </div>

      {/* Recommendations */}
      {similarRecommendations.recommendations.length > 0 && (
        <div className="mt-12 pt-12 border-t border-border">
          <RecommendationSection
            type="similar"
            title="Equipamentos Similares"
            items={similarRecommendations.recommendations}
            maxItems={4}
            loading={similarRecommendations.loading}
            viewAllLink="/equipamentos"
            viewAllText="Ver Mais Equipamentos"
            columns={{ sm: 1, md: 2, lg: 4 }}
          />
        </div>
      )}

      {frequentlyBoughtRecommendations.recommendations.length > 0 && (
        <div className="mt-8">
          <RecommendationSection
            type="frequently-bought"
            title="Frequentemente Reservados Juntos"
            items={frequentlyBoughtRecommendations.recommendations}
            maxItems={4}
            loading={frequentlyBoughtRecommendations.loading}
            viewAllLink="/equipamentos"
            viewAllText="Explorar Mais"
            columns={{ sm: 1, md: 2, lg: 4 }}
          />
        </div>
      )}
    </div>
  );
};

export default EquipmentDetailPage;
