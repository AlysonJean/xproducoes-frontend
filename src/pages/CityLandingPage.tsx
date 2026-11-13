import React from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { PageLayout } from '../components/layouts/PageLayout';
import { SEO } from '../components/SEO';
import { TARGET_CITIES, parseServiceCitySlug } from '../utils/localSeoConfig';
import { Card, buttonVariants } from '../components/ui/StandardComponents';
import { RecommendationSection } from '../components/ui/RecommendationSection';
import { useRecommendations } from '../hooks/useRecommendations';
import { MapPinIcon, StarIcon, CheckCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/solid';
import { ChevronDown } from 'lucide-react';

import { TestimonialCarousel } from '../components/TestimonialCarousel';
import { apiFetch } from '../services/api';
import { useState, useEffect, useId } from 'react';
import { logger } from '../utils/logger';
import { getWhatsAppPhone } from '../utils/whatsapp';
import { formatPhoneDisplay } from '../data/site';
import { briefingHref } from '../utils/briefing';
import { NotFoundPage } from './NotFoundPage';

export const CityLandingPage = () => {
  const { seoSlug } = useParams<{ seoSlug: string }>();
  const [reviewStats, setReviewStats] = useState<{ total: number; averageRating: number } | null>(null);

  const combo = seoSlug ? parseServiceCitySlug(seoSlug) : null;
  const city = combo?.city;
  const service = combo?.service;

  // Achado: a página inteira esperava as estatísticas de avaliação + um temporizador mínimo de
  // 800ms antes de aparecer — e, como o useEffect não roda no SSR, as ~20 landings de SEO local
  // saíam do servidor com o h1 "Carregando...". Agora o conteúdo (100% estático) renderiza
  // direto e só o selo de avaliações aparece quando os números chegam.
  useEffect(() => {
    apiFetch<{ total: number; averageRating: number }>('/reviews/stats')
      .then((data) => setReviewStats(data))
      .catch(err => logger.error('Failed to fetch stats', 'CityLandingPage', err));
  }, []);

  const recommendations = useRecommendations({
    type: 'similar',
    itemType: 'equipment',
    limit: 4,
    autoFetch: true
  });

  // Achado (auditoria ponta a ponta): slug que não é serviço×cidade fazia <Navigate to="/404" /> —
  // mas /404 também casa com /:seoSlug, então o redirecionamento caía aqui de novo e terminava numa
  // página em branco, sem título, indexável e com status 200. Agora o próprio endereço mostra a
  // página 404 (com noindex) e o SSR responde 404 (ver NotFoundPage).
  if (!city || !service) {
    return <NotFoundPage />;
  }

  // Sem "| X-Produções" aqui: o <SEO>/PageLayout já acrescentam o nome do site (saía duplicado).
  const title = `${service.name} em ${city.name}, ${city.uf}`;
  // Auditoria do orçamento (12/11/2026), E5 e E10: "Entrega e montagem" valia para tudo e para o LED, que é sob
  // consulta. A montagem vem incluída nos kits de entrega; o LED é por parceiro.
  const coverage = service.onRequest
    ? `Atendemos ${city.name} e região, sob consulta.`
    : `Entrega em ${city.name} e região, com montagem incluída nos kits de entrega.`;
  const description = `${service.name} profissional para eventos em ${city.name}. ${service.description} ${coverage} Peça seu orçamento!`;
  const quoteHref = service.briefingNeed ? briefingHref({ needs: [service.briefingNeed] }) : '/briefing';
  const whatsAppPhone = getWhatsAppPhone();

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

  // Aggregate Rating Schema (números reais de /reviews/stats)
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
  const combinedJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "X Produções",
    "image": "https://www.xproducoeseeventos.com.br/xproducoes-logo.png", // Absolute URL preferred
    ...faqSchema,
    ...reviewSchema
  };

  return (
    // hideTitle: o hero abaixo tem o h1 da página (antes saíam dois h1).
    <PageLayout title={title} description={description} hideTitle>
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
            <MapPinIcon className="w-4 h-4" aria-hidden="true" />
            Atendendo {city.name} e Região
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-foreground">
            {service.name} em <span className="text-primary">{city.name}</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            {service.description} Transforme seu evento em {city.name} com a qualidade X Produções.
          </p>

          {/* Selo de avaliações (números reais) */}
          {reviewStats && reviewStats.total > 0 && (
            <div className="flex items-center justify-center gap-2 mb-8 text-sm font-medium bg-background/50 inline-flex px-4 py-2 rounded-full border border-border/50 backdrop-blur-sm">
               <div className="flex text-warning" aria-hidden="true">
                 {[...Array(5)].map((_,i) => (
                   <StarIcon key={i} className={`w-4 h-4 ${i < Math.round(reviewStats.averageRating) ? 'fill-current' : 'text-muted-foreground'}`} />
                 ))}
               </div>
               <span className="text-foreground">
                 {reviewStats.averageRating.toFixed(1)} ({reviewStats.total} avaliações)
               </span>
            </div>
          )}

          {/* Achado: eram <Link><Button> aninhados (botão dentro de link). Agora o próprio link
              tem a aparência de botão. */}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to={quoteHref} className={buttonVariants({ size: 'lg', className: 'w-full sm:w-auto' })}>
              Solicitar Orçamento Grátis
            </Link>
            <Link to="/portfolio" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full sm:w-auto' })}>
              Ver Eventos Realizados
            </Link>
          </div>
        </div>

        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-0 opacity-10 pointer-events-none" aria-hidden="true">
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
                     <CheckCircleIcon className="w-6 h-6" aria-hidden="true" />
                   </div>
                   <p className="font-medium text-foreground pt-1">{benefit}</p>
                 </div>
               ))}
             </div>
          ) : (
            // Fallback default benefits if none provided
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <Card className="p-6 border-border/50">
                <CheckCircleIcon className="w-10 h-10 text-success mb-3" aria-hidden="true" />
                <h2 className="text-lg font-bold mb-2 text-foreground">Entrega em {city.name}</h2>
                <p className="text-sm text-muted-foreground">Logística otimizada para sua região.</p>
              </Card>
              <Card className="p-6 border-border/50">
                <StarIcon className="w-10 h-10 text-warning mb-3" aria-hidden="true" />
                <h2 className="text-lg font-bold mb-2 text-foreground">Equipamento Profissional</h2>
                <p className="text-sm text-muted-foreground">Equipamentos profissionais, revisados antes de cada evento.</p>
              </Card>
              <Card className="p-6 border-border/50">
                <MapPinIcon className="w-10 h-10 text-primary mb-3" aria-hidden="true" />
                <h2 className="text-lg font-bold mb-2 text-foreground">Suporte Local</h2>
                <p className="text-sm text-muted-foreground">Conhecemos os locais de {city.name}.</p>
              </Card>
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
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-2 text-foreground">
                <QuestionMarkCircleIcon className="w-8 h-8 text-primary" aria-hidden="true" />
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
                {/* Auditoria do orçamento (12/11/2026), O22: o pedido não é reserva; a data só fica confirmada com o
                    aceite da proposta e a parcela inicial. O botão vai ao briefing (o contato grava fora das reservas). */}
                <h2 className="text-xl font-bold mb-4 text-foreground">Quer um orçamento?</h2>
                <p className="text-muted-foreground mb-6">
                  Conte como vai ser o seu evento em {city.name}. A equipe confere a disponibilidade da data e manda a
                  proposta; a data fica confirmada depois do aceite e da parcela inicial.
                </p>
                <Link to={quoteHref} className={buttonVariants({ fullWidth: true, className: 'mb-3' })}>
                  Solicitar Cotação
                </Link>
                {/* Achado: aqui aparecia "(31) 97580-8477" — o telefone do desenvolvedor (crédito do
                    rodapé), sem link. Agora é o WhatsApp comercial do site (getWhatsAppPhone). */}
                <div className="text-center text-sm text-muted-foreground">
                  <span className="block mb-1">Ou chame no WhatsApp:</span>
                  <a
                    href={`https://wa.me/${whatsAppPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-foreground hover:text-primary underline-offset-4 hover:underline"
                  >
                    {formatPhoneDisplay(whatsAppPhone)}
                  </a>
                </div>
             </div>

             {/* Local Keywords Cloud (SEO) */}
             <div className="bg-muted/20 border border-border/50 rounded-xl p-6">
               <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-4 tracking-wider">Serviços em Destaque</h3>
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
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2 text-foreground">Equipamentos Disponíveis</h2>
            <p className="text-muted-foreground">Confira algumas opções para seu evento em {city.name}</p>
          </div>
          <Link to="/equipamentos" className="text-primary hover:underline underline-offset-4 hidden md:inline-block">
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
          <Link to="/equipamentos" className="text-primary hover:underline underline-offset-4">
            Ver catálogo completo →
          </Link>
        </div>
      </section>

      {/* Other Cities Links (Internal Linking) */}
      <section className="bg-muted/30 rounded-2xl p-8 border border-border/50">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Atendemos também em:</h2>
        <div className="flex flex-wrap gap-3">
          {TARGET_CITIES.filter(c => c.slug !== city.slug).map(c => (
             <Link
               key={c.slug}
               to={`/${service.slug}-${c.slug}`}
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
// Achado: o botão não informava se estava aberto (sem aria-expanded/aria-controls) e a resposta
// usava animate-accordion-down, que depende de uma variável do Radix que não existe aqui.
const FAQAccordion = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const answerId = useId();

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={answerId}
        className="w-full flex justify-between items-center gap-4 p-4 text-left font-medium text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span>{question}</span>
        <ChevronDown className={`w-5 h-5 flex-shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {isOpen && (
        <div id={answerId} className="p-4 pt-0 text-muted-foreground leading-relaxed animate-in fade-in border-t border-border/50 bg-muted/20">
          <p className="mt-4">{answer}</p>
        </div>
      )}
    </div>
  );
};

export default CityLandingPage;
