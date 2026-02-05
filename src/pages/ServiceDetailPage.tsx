import { useState, useEffect } from 'react';
import { useRevealOnView } from '../hooks/useRevealOnView';
import { useParams, Link } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { apiFetch } from '../services/api';
import { useCart } from '@/hooks/useCart';
import BrandLoader from '../components/ui/BrandLoader';
import type { Service } from '../types/types';
import { formatPrice } from '../utils/typeSafeFormatters';
import { SEO } from '../components/SEO';
import { useNotifications } from '../contexts/NotificationContext';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import CompareButton from '../components/ui/CompareButton';

// Mock function for now if backend doesn't support 'prevSlug'/'nextSlug' for services yet
// or if Types are missing slug


export const ServiceDetailPage = () => {
  const { ref: titleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { addNotification } = useNotifications();

  useEffect(() => {
    if (!slug) return;
    const fetchService = async () => {
      try {
        setLoading(true);
        const data = await apiFetch(`/services/${slug}`);
        setService(data as Service);

        // GA Tracking - View Item
        if (data) {
          ReactGA.event({
            category: "ecommerce",
            action: "view_item",
            label: (data as Service).name,
            value: Number((data as Service).price || 0)
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
      // Assuming addItem handles 'service' type or maps it correctly
      // Checking useCart hook usage in other files: addItem(item, type)
      // We need to extend cart types if not already done, but usually it's generic
      addItem(service, 'service' as any); 
      addNotification({
        type: 'success',
        title: 'Adicionado ao Orçamento',
        message: `${service.name} foi adicionado.`
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
        // image={service.imageUrl} 
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

       {/* Breadcrumb - similar to KitDetailPage */}
       <nav className="text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-primary">Início</Link>
        <span className="mx-2">&gt;</span>
        <Link to="/servicos" className="hover:text-primary">Serviços</Link>
        <span className="mx-2">&gt;</span>
        <span className="text-primary">{service.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
        <div>
          <img
            src={
            //   service.imageUrl || // Assuming service has imageUrl
              `https://placehold.co/800x600/1f2937/ffffff?text=${service.name.replace(/\s/g, '+')}`
            }
            alt={`Imagem de ${service.name}`}
            className="w-full h-auto rounded-lg object-cover shadow-lg"
            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
              e.currentTarget.src = `https://placehold.co/800x600/1f2937/ffffff?text=Imagem+Indisponível`;
            }}
          />
        </div>
        <div className="flex flex-col">
            <div className="flex justify-between items-start">
             <h1 ref={titleRef} className="text-4xl lg:text-5xl font-bold text-primary mb-4 heading-elegant">
                {service.name}
             </h1>
             <div className="flex space-x-2">
                 {/* Favorite and Compare Buttons */}
                 <FavoriteButton equipmentId={service.id} equipmentName={service.name} size="lg" isService={true} />
                 {/* Compare for services? User asked for "same as equipment/kits". */}
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
                {formatPrice(service.price || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
                <span className="text-muted-foreground">Duração</span>
                <span className="text-xl font-semibold">
                    {service.duration ? `${service.duration} horas` : 'A combinar'}
                </span>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full bg-primary hover:bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg text-lg transition-transform transform hover:scale-105"
          >
            Tenho Interesse / Adicionar ao Orçamento
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailPage;
