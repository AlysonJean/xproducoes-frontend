import React from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { PageLayout } from '../components/layouts/PageLayout';
import { SEO } from '../components/SEO';
import { TARGET_CITIES, TARGET_SERVICES } from '../utils/localSeoConfig';
import { Button } from '../components/ui/StandardComponents';
import { RecommendationSection } from '../components/ui/RecommendationSection';
import { useRecommendations } from '../hooks/useRecommendations';
import { MapPinIcon, StarIcon, CheckCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/solid';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { TestimonialCarousel } from '../components/TestimonialCarousel';
import { apiFetch } from '../services/api';
import { useState, useEffect } from 'react';
import { Skeleton } from '../components/ui/StandardComponents';
import { BrandLoader } from '../components/ui/BrandLoader';

const CityLandingSkeleton = () => (
  <PageLayout title="Carregando..." description="Sincronizando serviços locais.">
    {/* Hero Skeleton */}
    <div className="relative overflow-hidden rounded-3xl bg-primary/5 border border-primary/10 px-6 py-16 md:py-24 mb-16">
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <Skeleton className="h-8 w-48 mx-auto rounded-full" />
        <Skeleton className="h-16 w-3/4 mx-auto" />
        <Skeleton className="h-8 w-1/2 mx-auto" />
        <div className="flex justify-center gap-4">
          <Skeleton className="h-14 w-48 rounded-lg" />
          <Skeleton className="h-14 w-48 rounded-lg" />
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-20">
      <div className="lg:col-span-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="lg:col-span-4">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  </PageLayout>
);

export const CityLandingPage = () => {
  const { serviceSlug, citySlug } = useParams<{ serviceSlug: string; citySlug: string }>();
  const [reviewStats, setReviewStats] = useState<{ total: number; averageRating: number } | null>(null);
  const [loading, setLoading] = useState(true);
  
  const city = TARGET_CITIES.find(c => c.slug === citySlug);
  const service = TARGET_SERVICES.find(s => s.slug === serviceSlug);

  useEffect(() => {
    const statsPromise = apiFetch('/reviews/stats')
      .then((data: any) => setReviewStats(data))
      .catch(err => console.error('Failed to fetch stats', err));

    const minTimer = new Promise(resolve => setTimeout(resolve, 800));

    Promise.all([statsPromise, minTimer]).finally(() => setLoading(false));
  }, []);

  // If invalid service or city, redirect to 404
  const recommendations = useRecommendations({
    type: 'similar',
    itemType: 'equipment',
    limit: 4,
    autoFetch: true
  });

  if (!city || !service) {
    return <Navigate to="/404" replace />;
  }

  if (loading) {
    return (
      <div className="relative">
        <BrandLoader fullScreen size={140} label={`Chegando em ${city.name}...`} />
        <CityLandingSkeleton />
      </div>
    );
  }

  const title = `${service.name} em ${city.name}, ${city.uf} | X-Produções`;
  const description = `${service.name} profissional para eventos em ${city.name}. ${service.description} Entrega e montagem rápida em ${city.name} e região. Peça seu orçamento!`;

  // Base FAQ Schema
  const faqSchema = service.faq ? {
    "@type": "FAQPage",
    "mainEntity": service.faq.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  } : {};

  // Aggregate Rating Schema
  const reviewSchema = reviewStats && reviewStats.total > 0 ? {
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": reviewStats.averageRating.toFixed(1),
      "reviewCount": reviewStats.total,
      "bestRating": "5",
      "worstRating": "1"
    }
  } : {};

  // Combine Schemas (LocalBusiness + FAQ + Reviews)
  // We pass this to SEO component which merges it with base LocalBusiness schema
  const combinedJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "X Produções",
    "image": "https://xproducoes.com.br/xproducoes-logo.svg", // Absolute URL preferred
    ...faqSchema,
    ...reviewSchema
  };

  return (
    <PageLayout title={title} description={description}>
      <SEO 
        title={title}
        description={description}
        keywords={`${service.keywords.join(', ')}, ${service.name} ${city.name}, eventos ${city.name}`}
        jsonLd={combinedJsonLd}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-primary/5 border border-primary/10 px-6 py-16 md:py-24 mb-16">
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
            <MapPinIcon className="w-4 h-4" />
            Atendendo {city.name} e Região
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 heading-elegant leading-tight">
            {service.name} em <span className="text-primary">{city.name}</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            {service.description} Transforme seu evento em {city.name} com a qualidade X-Produções.
          </p>
          
          {/* Trust Badge (Review Stats) */}
          {reviewStats && reviewStats.total > 0 && (
            <div className="flex items-center justify-center gap-2 mb-8 text-sm font-medium bg-background/50 inline-flex px-4 py-2 rounded-full border border-border/50 backdrop-blur-sm">
               <div className="flex text-amber-500">
                 {[...Array(5)].map((_,i) => (
                   <StarIcon key={i} className={`w-4 h-4 ${i < Math.round(reviewStats.averageRating) ? 'fill-current' : 'text-gray-300'}`} />
                 ))}
               </div>
               <span className="text-foreground">
                 {reviewStats.averageRating.toFixed(1)} ({reviewStats.total} avaliações)
               </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/contato">
              <Button size="lg" className="w-full sm:w-auto px-8 py-6 text-lg shadow-lg hover:shadow-primary/25 transition-all">
                Solicitar Orçamento Grátis
              </Button>
            </Link>
            <Link to="/portfolio">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 py-6 text-lg">
                Ver Eventos Realizados
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-0 opacity-10 pointer-events-none">
           <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/40 rounded-full blur-3xl" />
           <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-secondary/40 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Rich Content - Benefits & Description */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-20">
        
        {/* Main Content Area */}
        <div className="lg:col-span-8">
          {/* Benefits Grid */}
          {(service.benefits && service.benefits.length > 0) ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
               {service.benefits.map((benefit, idx) => (
                 <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-colors">
                   <div className="p-2 bg-success/10 rounded-lg text-success">
                     <CheckCircleIcon className="w-6 h-6" />
                   </div>
                   <p className="font-medium text-foreground pt-1">{benefit}</p>
                 </div>
               ))}
             </div>
          ) : (
            // Fallback default benefits if none provided
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="card p-6 bg-card border border-border/50">
                <CheckCircleIcon className="w-10 h-10 text-success mb-3" />
                <h3 className="text-lg font-bold mb-2">Entrega em {city.name}</h3>
                <p className="text-sm text-muted-foreground">Logística otimizada para sua região.</p>
              </div>
              <div className="card p-6 bg-card border border-border/50">
                <StarIcon className="w-10 h-10 text-warning mb-3" />
                <h3 className="text-lg font-bold mb-2">Qualidade Premium</h3>
                <p className="text-sm text-muted-foreground">Equipamentos das melhores marcas.</p>
              </div>
              <div className="card p-6 bg-card border border-border/50">
                <MapPinIcon className="w-10 h-10 text-primary mb-3" />
                <h3 className="text-lg font-bold mb-2">Suporte Local</h3>
                <p className="text-sm text-muted-foreground">Conhecemos os locais de {city.name}.</p>
              </div>
            </div>
          )}

          {/* Long Description (Markdown) */}
          {service.longDescription && (
            <article className="prose prose-lg dark:prose-invert max-w-none mb-12">
              <ReactMarkdown>{service.longDescription}</ReactMarkdown>
            </article>
          )}

          {/* FAQ Section */}
          {(service.faq && service.faq.length > 0) && (
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
                <QuestionMarkCircleIcon className="w-8 h-8 text-primary" />
                Perguntas Frequentes
              </h2>
              <div className="space-y-4">
                {service.faq.map((item, idx) => (
                  <FAQAccordion key={idx} question={item.question} answer={item.answer} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar / CTA Area */}
        <div className="lg:col-span-4 space-y-8">
           <div className="sticky top-24">
             <div className="bg-card border border-border rounded-xl p-6 shadow-lg mb-6">
                <h3 className="text-xl font-bold mb-4">Pronto para reservar?</h3>
                <p className="text-muted-foreground mb-6">
                  Garanta a data do seu evento em {city.name} hoje mesmo. A agenda costuma lotar rápido!
                </p>
                <Link to="/contato" className="block mb-3">
                  <Button className="w-full text-lg py-6">Solicitar Cotação</Button>
                </Link>
                <div className="text-center text-sm text-muted-foreground">
                  <span className="block mb-1">Ou chame no WhatsApp:</span>
                  <strong className="text-foreground">(31) 97580-8477</strong>
                </div>
             </div>
             
             {/* Local Keywords Cloud (SEO) */}
             <div className="bg-muted/20 border border-border/50 rounded-xl p-6">
               <h4 className="text-sm font-semibold uppercase text-muted-foreground mb-4 tracking-wider">Serviços em Destaque</h4>
               <div className="flex flex-wrap gap-2">
                 {service.keywords.map((k, i) => (
                   <span key={i} className="text-xs bg-background border border-border px-2 py-1 rounded-md text-muted-foreground">
                     {k}
                   </span>
                 ))}
               </div>
             </div>
           </div>
        </div>

      </div>

      {/* Testimonials Section (Trust Signals) */}
      <TestimonialCarousel />

      {/* Featured Equipment */}
      <section className="mb-20">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold heading-elegant mb-2">Equipamentos Disponíveis</h2>
            <p className="text-muted-foreground">Confira algumas opções para seu evento em {city.name}</p>
          </div>
          <Link to="/equipamentos" className="text-primary hover:underline hidden md:inline-block">
            Ver catálogo completo →
          </Link>
        </div>
        
        <RecommendationSection
          type="similar"
          items={recommendations.recommendations}
          loading={recommendations.loading}
          maxItems={4}
          columns={{ sm: 1, md: 2, lg: 4 }}
        />
        
        <div className="mt-8 text-center md:hidden">
          <Link to="/equipamentos" className="text-primary hover:underline">
            Ver catálogo completo →
          </Link>
        </div>
      </section>

      {/* Other Cities Links (Internal Linking) */}
      <section className="bg-muted/30 rounded-2xl p-8 border border-border/50">
        <h3 className="text-lg font-semibold mb-4">Atendemos também em:</h3>
        <div className="flex flex-wrap gap-3">
          {TARGET_CITIES.filter(c => c.slug !== citySlug).map(c => (
             <Link 
               key={c.slug}
               to={`/${serviceSlug}-${c.slug}`}
               className="px-4 py-2 bg-background border border-border rounded-full text-sm text-foreground/80 hover:text-primary hover:border-primary transition-colors"
             >
               {service.name.replace('Aluguel de ', '')} em {c.name}
             </Link>
          ))}
        </div>
      </section>
    </PageLayout>
  );
};

// Simple Accordion Component for FAQs
const FAQAccordion = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left font-medium hover:bg-muted/50 transition-colors"
      >
        <span>{question}</span>
        {isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>
      {isOpen && (
        <div className="p-4 pt-0 text-muted-foreground leading-relaxed animate-accordion-down border-t border-border/50 bg-muted/20">
          <p className="mt-4">{answer}</p>
        </div>
      )}
    </div>
  );
};

export default CityLandingPage;
