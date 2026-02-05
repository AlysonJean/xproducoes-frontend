// Caminho do arquivo: frontend/src/pages/HomePage.tsx

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useRevealOnView } from '../hooks/useRevealOnView';
import { KitCard } from '../components/ui/KitCard';
import { PortfolioCard } from '../components/ui/PortfolioCard';
import { ServiceCard } from '../components/ui/ServiceCard';
import { apiFetch } from '../services/api';
import type { Category, Kit, PortfolioItem, Service } from '../types/types';
import { transformKit } from '../utils/transformKit';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { GeminiEventSuggester } from '../components/ui/GeminiEventSuggester';
import { PageLoading } from '../components/layouts/PageLayout';
import { Grid } from '../components/ui/StandardComponents';
import { TestimonialCard } from '../components/ui/TestimonialCard';
import { BannerCarousel } from '../components/ui/BannerCarousel';
import { CategoryEquipmentRow } from '../components/ui/CategoryEquipmentRow';
import { SEO } from '../components/SEO';

// Componente isolado para evitar rerenders e uso de style inline no pai
const SoundBar = memo(() => {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (barRef.current) {
      // Define variaveis CSS dinamicamente para evitar 'style' inline no JSX
      barRef.current.style.setProperty('--bar-height', `${Math.random() * 60 + 20}%`);
      barRef.current.style.setProperty('--bar-delay', `${Math.random() * 0.5}s`);
      barRef.current.style.setProperty('--bar-duration', `${0.8 + Math.random() * 0.6}s`);
    }
  }, []);

  return (
    <div
      ref={barRef}
      className="sound-bar bg-primary/5 flex-1 rounded-full transition-all duration-300"
    />
  );
});
SoundBar.displayName = 'SoundBar';

export const HomePage = () => {
  const { ref: heroTitleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const { ref: kitsTitleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const { ref: equipmentsTitleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const { ref: portfolioTitleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  // Seção de avaliações/depoimentos
  const { ref: aiTitleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const [kits, setKits] = useState<Kit[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  // Estado de avaliações públicas aprovadas
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPageData = useCallback(async () => {
    setLoading(true);
    // Timeout de segurança para garantir que o loader desapareça
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
      console.warn('Forçando fim do loading da Home após timeout');
    }, 10000);

    // Não limpa o erro anterior imediatamente para evitar flash, mas permite nova tentativa
    // setError(null); 

    // Helper para buscar dados de forma segura (sem quebrar a página toda se um falhar)
    const safeFetch = async <T,>(promise: Promise<T>, fallback: T): Promise<T> => {
      try {
        return await promise;
      } catch (error) {
        console.warn('Falha não-crítica ao carregar seção da home:', error);
        return fallback;
      }
    };

    try {
      // Usa Promise.all com proteção individual para cada requisição
      const [catsData, kitsData, portfolioData, servicesData] = await Promise.all([
        safeFetch(apiFetch('/categories'), []),
        safeFetch(apiFetch('/kits?limit=4'), []),
        safeFetch(apiFetch('/portfolio?limit=3'), []),
        safeFetch(apiFetch('/services'), []),
      ]);

      setCategories(catsData as Category[]);
      
      const transformedKits = (kitsData as Kit[]).map(kit => transformKit(kit));
      setKits(transformedKits);
      
      setPortfolio(portfolioData as PortfolioItem[]);
      setServices(servicesData as Service[]);
    } catch (err) {
      console.error('Erro detalhado no fetchPageData:', err);
      // Não bloqueia mais a renderização com tela de erro fatal
      // setError('Erro ao carregar dados da API. Tente novamente mais tarde.');
    } finally {
      clearTimeout(loadingTimeout);
      setLoading(false);
    }
  }, []);

  // Buscar avaliações públicas aprovadas (recentes)
  const fetchPublicReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      // Preferir endpoint recente para limitar quantidade, caindo para /reviews/public
      let data: any[] | null = null;
      try {
  data = await apiFetch('/reviews/recent?limit=8');
      } catch {
        // fallback
  data = await apiFetch('/reviews/public');
      }
      // Normalizar campos esperados pelo TestimonialCard
      const normalized = (data || []).map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        user: { name: r.reviewer?.name || r.collaborator?.user?.name || 'Cliente' },
      }));
      setReviews(normalized);
  } catch (e) {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  // Busca inicial dos dados da página
  useEffect(() => {
    fetchPageData();
  fetchPublicReviews();
  }, [fetchPageData, fetchPublicReviews]);

  if (loading) return <PageLoading message="Carregando página inicial..." />;
  // if (error) return <PageError message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <SEO 
        title="Aluguel de Som, Luz e LED" 
        description="A melhor empresa de aluguel de som, iluminação e painel de LED em Belo Horizonte. Equipamentos profissionais para casamentos, festas e eventos corporativos."
      />
      
      {/* Dynamic Banner Carousel */}
      <BannerCarousel />

      {/* Hero Section - Reduced Size */}
      <div className="relative py-8 sm:py-10 lg:py-12 mb-8 sm:mb-12 overflow-hidden">
        <div className="absolute inset-0 -z-10 pointer-events-none bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"></div>
        <div 
          className="relative text-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          onMouseMove={(e) => {
            const el = e.currentTarget;
            el.style.setProperty('--mouse-x', `${e.clientX}px`);
            el.style.setProperty('--mouse-y', `${e.clientY}px`);
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.setProperty('--mouse-x', '-9999px');
            el.style.setProperty('--mouse-y', '-9999px');
          }}
        >
          {/* Animated Sound Wave Background - Reduced Height */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
            <div className="flex items-center justify-between gap-0.5 h-16 sm:h-20 lg:h-24 z-0 w-full px-2">
              {[...Array(120)].map((_, i) => (
                <SoundBar key={i} />
              ))}
            </div>
          </div>

          <div className="relative z-10 pointer-events-none">
            <h1 ref={heroTitleRef} className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 heading-elegant pointer-events-auto">
              Equipamentos Profissionais
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-4 max-w-3xl mx-auto pointer-events-auto">
              Transforme seus eventos em experiências inesquecíveis com nossa tecnologia de ponta
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 space-y-16 sm:space-y-20 lg:space-y-24 xl:space-y-28 2xl:space-y-32">
        {/* Kits em Destaque */}
        {kits && kits.length > 0 && (
          <section className="relative">
            <div className="text-center mb-12 sm:mb-14 lg:mb-16 xl:mb-18 2xl:mb-20">
              <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full text-primary font-medium text-xs sm:text-sm mb-3">
                ⭐ Soluções Completas
              </div>
              <h2 ref={kitsTitleRef} className="text-2xl sm:text-3xl font-bold text-foreground mb-3 heading-elegant">Kits em Destaque</h2>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
                Pacotes completos que combinam os melhores equipamentos para diferentes tipos de eventos
              </p>
            </div>
            <Grid columns={{ sm: 1, md: 2, lg: 3, xl: 4, '2xl': 4, '3xl': 5, '4xl': 6 }} gap={8}>
              {kits.map((kit) => (
                <div key={kit.id} className="group">
                  <KitCard kit={kit} />
                </div>
              ))}
            </Grid>
          </section>
        )}

        {/* Equipamentos por Categoria */}
        <section className="relative">
          <div className="text-center mb-10 sm:mb-12 lg:mb-14">
            <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full text-primary font-medium text-xs sm:text-sm mb-3">
              🎯 Catálogo Completo
            </div>
            <h2 ref={equipmentsTitleRef} className="text-2xl sm:text-3xl font-bold text-foreground mb-3 heading-elegant">Nossos Equipamentos</h2>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore nossa coleção completa dividida por categorias
            </p>
          </div>

          <div className="space-y-4">
             {loading ? (
                <div className="flex justify-center py-12">
                   <BrandLoader size={60} label="Carregando categorias..." />
                </div>
             ) : (
                categories.map((category) => (
                  <CategoryEquipmentRow key={category.id} category={category} />
                ))
             )}
          </div>
        </section>

        {/* Services */}
        {services && services.length > 0 && (
          <section className="relative">
            <div className="text-center mb-10 sm:mb-12 lg:mb-14">
              <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 rounded-full text-blue-600 font-medium text-xs sm:text-sm mb-3">
                🛠️ Serviços Especializados
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 heading-elegant">Nossos Serviços</h2>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
                Complemente seu evento com nossos serviços profissionais
              </p>
            </div>
            <Grid columns={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap={8}>
              {services.map((service) => (
                <div key={service.id} className="group">
                  <ServiceCard service={service} />
                </div>
              ))}
            </Grid>
          </section>
        )}

        {/* Portfólio */}
        {portfolio && portfolio.length > 0 && (
          <section className="relative">
            <div className="text-center mb-10 sm:mb-12 lg:mb-14">
              <div className="inline-flex items-center px-4 py-2 bg-success/10 rounded-full text-success font-medium text-xs sm:text-sm mb-3">
                📸 Galeria de Eventos
              </div>
              <h2 ref={portfolioTitleRef} className="text-2xl sm:text-3xl font-bold text-foreground mb-3 heading-elegant">Galeria de Eventos</h2>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
                Confira alguns dos eventos realizados com nossos equipamentos
              </p>
            </div>
            <Grid columns={{ sm: 1, md: 2, lg: 3, xl: 3, '2xl': 4, '3xl': 4, '4xl': 5 }} gap={8}>
              {portfolio.map((item) => (
                <div key={item.id} className="group">
                  <PortfolioCard item={item} />
                </div>
              ))}
            </Grid>
          </section>
        )}

        {/* Depoimentos (Avaliações aprovadas) */}
        {(!reviewsLoading && reviews && reviews.length > 0) && (
          <section className="relative">
            <div className="text-center mb-10 sm:mb-12 lg:mb-14">
              <div className="inline-flex items-center px-4 py-2 bg-amber-500/10 rounded-full text-amber-600 font-medium text-xs sm:text-sm mb-3">
                💬 Clientes Satisfeitos
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 heading-elegant">O que dizem sobre nós</h2>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
                Depoimentos reais de clientes que alugaram nossos equipamentos e aprovaram a experiência
              </p>
            </div>
            <Grid columns={{ sm: 1, md: 2, lg: 3, xl: 3, '2xl': 3, '3xl': 4, '4xl': 5 }} gap={8}>
              {reviews.map((review) => (
                <TestimonialCard key={review.id} review={review} />
              ))}
            </Grid>
          </section>
        )}
        {reviewsLoading && (
          <div className="flex justify-center items-center py-6 sm:py-7 lg:py-8 xl:py-9 2xl:py-10">
            <BrandLoader size={80} label="Carregando depoimentos..." />
          </div>
        )}

        {/* Gemini Event Suggester */}
        <section className="relative">
          <div className="text-center mb-10 sm:mb-12 lg:mb-14">
            <div className="inline-flex items-center px-4 py-2 bg-purple-500/10 rounded-full text-purple-600 font-medium text-xs sm:text-sm mb-3">
              🤖 IA Personalizada
            </div>
            <h2 ref={aiTitleRef} className="text-2xl sm:text-3xl font-bold text-foreground mb-3 heading-elegant">Sugestões Inteligentes</h2>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
              Nossa IA analisa suas necessidades e sugere os equipamentos ideais para seu evento
            </p>
          </div>
          <GeminiEventSuggester />
        </section>
      </div>
    </div>
  );
};
