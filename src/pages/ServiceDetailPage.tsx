import { useState, useEffect } from 'react';
import { useRevealOnView } from '../hooks/useRevealOnView';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ReactGA from 'react-ga4';
import { apiFetch } from '../services/api';
import { useCart } from '@/hooks/useCart';
import BrandLoader from '../components/ui/BrandLoader';
import type { Service } from '../types/types';
import { formatPrice } from '../utils/typeSafeFormatters';
import { transformService } from '../utils/transformService';
import { SEO } from '../components/SEO';
import { useNotifications } from '../contexts/NotificationContext';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import CompareButton from '../components/ui/CompareButton';
import { RecommendationSection } from '../components/ui/RecommendationSection';
import { useRecommendations } from '../hooks/useRecommendations';

export const ServiceDetailPage = () => {
  const { ref: titleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const [service, setService] = useState<(Service & { prevSlug?: string | null; nextSlug?: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { addNotification } = useNotifications();

  // Recommendations
  const similarRecommendations = useRecommendations({
    type: 'similar',
    itemId: slug || '',
    itemType: 'service',
    limit: 4,
    autoFetch: !!slug
  });

  const frequentlyBoughtRecommendations = useRecommendations({
    type: 'frequently-bought',
    itemId: slug || '',
    itemType: 'service',
    limit: 4,
    autoFetch: !!slug
  });

  useEffect(() => {
    if (!slug) return;
    const fetchService = async () => {
      try {
        setLoading(true);
        const data = await apiFetch(`/services/${slug}`);
        const transformed = transformService(data as Service);
        setService({
            ...transformed,
            prevSlug: (data as any).prevSlug,
            nextSlug: (data as any).nextSlug
        });

        if (data) {
          ReactGA.event({
            category: "ecommerce",
            action: "view_item",
            label: (data as any).name,
            value: Number((data as any).price || 0)
          });
        }

        setError(null);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'message' in err) {
          setError((err as { message: string }).message);
        } else {
          setError('Não foi possível carregar os detalhes do serviço.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [slug]);

  const handleAddToCart = () => {
    if (service) {
      addItem(service, 'service'); 
      addNotification({
        type: 'success',
        title: 'Adicionado ao Orçamento',
        message: `${service.name} foi adicionado ao seu orçamento.`
      });
    }
  };

  if (loading) return <BrandLoader fullScreen size={140} label="Carregando serviço..." />;
  if (error)
    return (
      <div className="text-center text-destructive bg-destructive/10 p-4 rounded-md border border-destructive">
        {error}
      </div>
    );
  if (!service)
    return (
      <div className="text-center text-xl text-destructive">
        Serviço não encontrado.
      </div>
    );

  return (
    <div className="bg-card p-6 md:p-8 rounded-lg shadow-2xl border border-border">
      <SEO
        title={service.name}
        description={service.description || `Contrate ${service.name} para seu evento.`}
        image={service.imageUrl || undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Service",
          "name": service.name,
          "description": service.description,
          "sku": service.id,
          "provider": {
            "@type": "Organization",
            "name": "X Produções"
          },
          "offers": {
            "@type": "Offer",
            "priceCurrency": "BRL",
            "price": service.price,
            "availability": "https://schema.org/InStock"
          }
        }}
      />

      {/* Navigation Arrows (Fixed sides as per Equipment pattern) */}
      {service.prevSlug && (
        <Link
          to={`/servicos/${service.prevSlug}`}
          className="fixed left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-primary hover:text-primary-foreground p-3 rounded-full shadow-lg border border-border backdrop-blur-sm transition-all z-50 hidden lg:flex items-center justify-center group text-foreground"
          title="Serviço Anterior"
        >
          <ChevronLeft className="w-8 h-8 group-hover:-translate-x-0.5 transition-transform" />
        </Link>
      )}
      {service.nextSlug && (
        <Link
          to={`/servicos/${service.nextSlug}`}
          className="fixed right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-primary hover:text-primary-foreground p-3 rounded-full shadow-lg border border-border backdrop-blur-sm transition-all z-50 hidden lg:flex items-center justify-center group text-foreground"
          title="Próximo Serviço"
        >
          <ChevronRight className="w-8 h-8 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Mobile Breadcrumb & Nav */}
      <div className="flex justify-between items-center mb-6 lg:mb-8">
        <nav className="text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">Início</Link>
          <span className="mx-2 text-border">&gt;</span>
          <Link to="/servicos" className="hover:text-primary transition-colors">Serviços</Link>
          <span className="mx-2 text-border">&gt;</span>
          <span className="text-primary font-medium">{service.name}</span>
        </nav>
        
        <div className="flex lg:hidden gap-2">
           {service.prevSlug && (
             <Link to={`/servicos/${service.prevSlug}`} className="p-2 bg-muted rounded-full">
               <ChevronLeft className="w-5 h-5 text-foreground" />
             </Link>
           )}
           {service.nextSlug && (
             <Link to={`/servicos/${service.nextSlug}`} className="p-2 bg-muted rounded-full">
               <ChevronRight className="w-5 h-5 text-foreground" />
             </Link>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
        <div className="relative group">
          <img
            src={service.imageUrl || `https://placehold.co/800x600/1f2937/ffffff?text=${service.name.replace(/\s/g, '+')}`}
            alt={service.name}
            className="w-full h-auto rounded-lg object-cover shadow-lg"
          />
          <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <FavoriteButton equipmentId={service.id} equipmentName={service.name} size="lg" isService={true} />
            <CompareButton equipment={service as any} size="lg" />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <h1 ref={titleRef} className="text-4xl lg:text-5xl font-bold text-primary heading-elegant">
              {service.name}
            </h1>
            <div className="hidden lg:flex space-x-2">
                <FavoriteButton equipmentId={service.id} equipmentName={service.name} size="lg" isService={true} />
                <CompareButton equipment={service as any} size="lg" />
            </div>
          </div>
          
          <p className="text-muted-foreground text-lg mb-6 flex-grow whitespace-pre-wrap">
            {service.description}
          </p>

          <div className="bg-muted/30 p-4 rounded-lg mb-6 border border-border">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Preço Estimado</span>
              <span className="text-3xl font-extrabold text-foreground">
                <span className="text-lg font-normal mr-2">a partir de</span>
                {formatPrice(service.price)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
                <span className="text-muted-foreground">Duração</span>
                <span className="text-xl font-semibold">
                    {service.duration ? `${service.duration} min` : 'A combinar'}
                </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-muted-foreground">Status</span>
              <span className={`text-xl font-semibold ${
                service.status === 'MAINTENANCE' ? 'text-orange-500' : 
                service.status === 'COMING_SOON' ? 'text-blue-500' : 
                'text-success'
              }`}>
                {service.status === 'MAINTENANCE' ? 'Em Manutenção' : 
                 service.status === 'COMING_SOON' ? 'Em Breve' : 
                 'Disponível'}
              </span>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={service.status === 'MAINTENANCE'}
            className={`w-full font-bold py-3 px-4 rounded-lg text-lg transition-transform transform active:scale-95 ${
              service.status !== 'MAINTENANCE' 
                ? 'bg-primary hover:bg-primary text-primary-foreground hover:scale-105 shadow-lg shadow-primary/20' 
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-70'
            }`}
          >
            {service.status === 'MAINTENANCE' ? 'Indisponível' : 
             service.status === 'COMING_SOON' ? 'Reserve com Antecedência' : 
             'Adicionar ao Orçamento'}
          </button>
        </div>
      </div>

      {/* Recommendations */}
      {similarRecommendations.recommendations.length > 0 && (
        <div className="mt-12 pt-12 border-t border-border">
          <RecommendationSection
            type="similar"
            title="Serviços Similares"
            items={similarRecommendations.recommendations}
            maxItems={4}
            loading={similarRecommendations.loading}
            viewAllLink="/servicos"
            viewAllText="Ver Mais Serviços"
            columns={{ sm: 1, md: 2, lg: 4 }}
          />
        </div>
      )}

      {frequentlyBoughtRecommendations.recommendations.length > 0 && (
        <div className="mt-8">
          <RecommendationSection
            type="frequently-bought"
            title="Geralmente Contratados Juntos"
            items={frequentlyBoughtRecommendations.recommendations}
            maxItems={4}
            loading={frequentlyBoughtRecommendations.loading}
            viewAllLink="/servicos"
            viewAllText="Ver Mais"
            columns={{ sm: 1, md: 2, lg: 4 }}
          />
        </div>
      )}
    </div>
  );
};

export default ServiceDetailPage;
