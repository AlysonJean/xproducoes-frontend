// src/pages/EquipmentDetailPage.tsx

import { useState, useEffect } from 'react';
import { useRevealOnView } from '../hooks/useRevealOnView';
import { useParams, Link } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { apiFetch } from '../services/api';
import { useCart } from '@/hooks/useCart';
import BrandLoader from '../components/ui/BrandLoader';
import type { Equipment } from '../types/types';
import { formatPrice } from '../utils/formatPrice';
import { SEO } from '../components/SEO';
import { transformEquipment } from '../utils/transformEquipment';
import { RecommendationSection } from '../components/ui/RecommendationSection';
import { useRecommendations } from '../hooks/useRecommendations';
import { useNotifications } from '../contexts/NotificationContext';
import { generateProductSchema } from '../utils/schemaGenerator';
import { StructuredData } from '../components/seo/StructuredData';
import { Skeleton } from '../components/ui/StandardComponents';

const EquipmentDetailSkeleton = () => (
  <div className="bg-card p-6 md:p-8 rounded-lg shadow-2xl border border-border">
    {/* Breadcrumb Skeleton */}
    <div className="flex justify-between items-center mb-6 lg:mb-8">
      <Skeleton className="h-4 w-48" />
      <div className="flex lg:hidden gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Image Skeleton */}
      <Skeleton className="aspect-[4/3] w-full rounded-lg" />
      
      {/* Content Skeleton */}
      <div className="flex flex-col">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3 mb-6" />

        <div className="bg-muted/30 p-4 rounded-lg mb-6 border border-border">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>

        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    </div>
  </div>
);

export const EquipmentDetailPage = () => {
  const { ref: titleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantityToAdd, setQuantityToAdd] = useState(1);

  // Recommendations hooks - MUST be at component top level
  const similarRecommendations = useRecommendations({
    type: 'similar',
    itemId: slug || '',
    itemType: 'equipment',
    limit: 4,
    autoFetch: !!slug  // Only fetch if we have an ID
  });

  const frequentlyBoughtRecommendations = useRecommendations({
    type: 'frequently-bought',
    itemId: slug || '',
    itemType: 'equipment',
    limit: 4,
    autoFetch: !!slug  // Only fetch if we have an ID
  });

  useEffect(() => {
    if (!slug) return;
    const fetchEquipment = async () => {
      try {
        setLoading(true);
        setEquipment(null); // Reset to ensure clean transition
        const data = await apiFetch(`/equipments/${slug}`);
        setEquipment(transformEquipment(data as Equipment));

        // GA Tracking - View Item
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
        if (err && typeof err === 'object' && 'message' in err) {
          setError((err as { message: string }).message);
        } else {
          setError('Não foi possível carregar os detalhes do equipamento.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchEquipment();
  }, [slug]);

  const { addNotification } = useNotifications();

  // ... (inside handleAddToCart)
  const handleAddToCart = () => {
    if (equipment) {
      addItem(equipment, 'equipment');
      addNotification({
        type: 'success',
        title: 'Adicionado ao Carrinho',
        message: `${equipment.name} foi adicionado ao seu carrinho.`
      });
    }
  };

  if (loading) {
    return (
      <div className="relative">
        <BrandLoader fullScreen size={140} label="Carregando equipamento..." />
        <EquipmentDetailSkeleton />
      </div>
    );
  }
  if (error)
    return (
      <div className="text-center text-destructive bg-destructive/10 p-4 rounded-md border border-destructive">
        {error}
      </div>
    );
  if (!equipment)
    return (
      <div className="text-center text-xl text-destructive">
        Equipamento não encontrado.
      </div>
    );

  return (
    <div className="bg-card p-6 md:p-8 rounded-lg shadow-2xl border border-border">
      <SEO
        title={equipment.name}
        description={equipment.description || `Aluguel de ${equipment.name} em Belo Horizonte e região. Confira preço e disponibilidade.`}
        image={equipment.imageUrl}
      />
      
      <StructuredData 
        schema={generateProductSchema({
          name: equipment.name,
          description: equipment.description || `Aluguel de ${equipment.name} em BH`,
          image: equipment.imageUrl || '',
          sku: equipment.id,
          price: equipment.pricePerHour,
          availability: equipment.isAvailable ? 'InStock' : 'OutOfStock'
        })}
      />
      {/* Breadcrumb & Navigation */}
      <div className="flex justify-between items-center mb-6 lg:mb-8">
        <nav className="text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">Início</Link>
          <span className="mx-2 text-border">&gt;</span>
          <Link to="/equipamentos" className="hover:text-primary transition-colors">Equipamentos</Link>
          {equipment.category && (
            <>
              <span className="mx-2 text-border">&gt;</span>
              <span className="hover:text-primary transition-colors">
                {typeof equipment.category === 'string' ? equipment.category : equipment.category.name}
              </span>
            </>
          )}
          <span className="mx-2 text-border">&gt;</span>
          <span className="text-primary font-medium truncate">{equipment.name}</span>
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

      {/* Navigation Arrows (Desktop) */}
      {equipment.prevSlug && (
        <Link
          to={`/equipamentos/${equipment.prevSlug}`}
          className="fixed left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-primary hover:text-primary-foreground p-3 rounded-full shadow-lg border border-border backdrop-blur-sm transition-all z-50 hidden lg:flex items-center justify-center group"
          title="Equipamento Anterior"
        >
          <ChevronLeft className="w-8 h-8 group-hover:-translate-x-0.5 transition-transform" />
        </Link>
      )}
      {equipment.nextSlug && (
        <Link
          to={`/equipamentos/${equipment.nextSlug}`}
          className="fixed right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-primary hover:text-primary-foreground p-3 rounded-full shadow-lg border border-border backdrop-blur-sm transition-all z-50 hidden lg:flex items-center justify-center group"
          title="Próximo Equipamento"
        >
          <ChevronRight className="w-8 h-8 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
        <div>
          <img
            src={
              equipment.imageUrl ||
              `https://placehold.co/800x600/1f2937/ffffff?text=${equipment.name.replace(/\s/g, '+')}`
            }
            alt={`Imagem de ${equipment.name}`}
            className="w-full h-auto rounded-lg object-cover shadow-lg"
            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
              e.currentTarget.src = `https://placehold.co/800x600/1f2937/ffffff?text=Imagem+Indisponível`;
            }}
          />
        </div>
        <div className="flex flex-col">
          <h1 ref={titleRef} className="text-4xl lg:text-5xl font-bold text-primary mb-4 heading-elegant">
            {equipment.name}
          </h1>
          <p className="text-muted-foreground text-lg mb-6 flex-grow whitespace-pre-wrap">
            {equipment.description}
          </p>

          <div className="bg-muted/30 p-4 rounded-lg mb-6 border border-border">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Preço por hora</span>
              <span className="text-3xl font-extrabold text-foreground">
                <span className="text-lg font-normal mr-2">a partir de</span>
                {formatPrice(equipment.pricePerHour || 0)}/h
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-muted-foreground">Status</span>
              <span className={`text-xl font-semibold ${
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

          <div className="flex items-center gap-4 mb-4">
            <label htmlFor="quantity" className="font-semibold">
              Quantidade:
            </label>
            <input
              type="number"
              id="quantity"
              min="1"
              max={10}
              value={quantityToAdd}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQuantityToAdd(Number(e.target.value))
              }
              className="w-20 bg-muted/30 border border-border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!equipment.isAvailable}
            className={`w-full font-bold py-3 px-4 rounded-lg text-lg transition-transform transform ${
              equipment.isAvailable 
                ? 'bg-primary hover:bg-primary text-primary-foreground hover:scale-105' 
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-70'
            }`}
          >
            {equipment.status === 'MAINTENANCE' ? 'Indisponível para Locação' : 
             equipment.status === 'COMING_SOON' ? 'Lançamento em Breve' : 
             equipment.isAvailable ? 'Adicionar ao Carrinho' : 'Indisponível'}
          </button>
        </div>
      </div>

      {/* Recomendações - Produtos Similares */}
      {similarRecommendations.recommendations.length > 0 && (
        <div className="mt-12">
          <RecommendationSection
            type="similar"
            items={similarRecommendations.recommendations}
            maxItems={4}
            loading={similarRecommendations.loading}
            viewAllLink="/equipamentos"
            viewAllText="Ver Mais Equipamentos"
            columns={{ sm: 1, md: 2, lg: 4 }}
          />
        </div>
      )}

      {/* Recomendações - Frequentemente Reservados Juntos */}
      {frequentlyBoughtRecommendations.recommendations.length > 0 && (
        <div className="mt-8">
          <RecommendationSection
            type="frequently-bought"
            items={frequentlyBoughtRecommendations.recommendations}
            maxItems={4}
            loading={frequentlyBoughtRecommendations.loading}
            viewAllLink="/equipamentos"
            viewAllText="Ver Mais"
            columns={{ sm: 1, md: 2, lg: 4 }}
          />
        </div>
      )}
    </div>
  );
};

// Export both named and default for compatibility
export default EquipmentDetailPage;
