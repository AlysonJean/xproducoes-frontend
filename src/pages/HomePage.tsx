// Caminho do arquivo: frontend/src/pages/HomePage.tsx

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Link } from 'react-router-dom';
import { useRevealOnView } from '../hooks/useRevealOnView';
import { KitCard } from '../components/ui/KitCard';
import { PortfolioCard } from '../components/ui/PortfolioCard';
import { ServiceRow } from '../components/ui/ServiceRow';
import { apiFetch } from '../services/api';
import type { Category, Kit, PortfolioItem } from '../types/types';
import { transformKit } from '../utils/transformKit';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { GeminiEventSuggester } from '../components/ui/GeminiEventSuggester';

import { Grid } from '../components/ui/StandardComponents';
import { TestimonialCard } from '../components/ui/TestimonialCard';
import { BannerCarousel } from '../components/ui/BannerCarousel';
import { CategoryEquipmentRow } from '../components/ui/CategoryEquipmentRow';
import { SEO } from '../components/SEO';

const FloatingGlow = () => (
  <div className="absolute inset-0 -z-20 overflow-hidden pointer-events-none">
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse-slow"></div>
    <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-secondary/10 blur-[100px] rounded-full animate-pulse-slow delay-700"></div>
    <div className="absolute top-[40%] left-[60%] w-[25%] h-[25%] bg-muted/10 blur-[80px] rounded-full animate-pulse-slow delay-1000"></div>
  </div>
);

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
      className="sound-bar bg-gradient-to-t from-primary/20 to-primary/5 flex-1 rounded-full transition-all duration-300"
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
      const [catsData, kitsData, portfolioData] = await Promise.all([
        safeFetch(apiFetch('/categories'), []),
        safeFetch(apiFetch('/kits?limit=4'), []),
        safeFetch(apiFetch('/portfolio?limit=3'), []),
      ]);

      setCategories(catsData as Category[]);
      
      const transformedKits = (kitsData as Kit[]).map(kit => transformKit(kit));
      setKits(transformedKits);
      
      const sortedPortfolio = (portfolioData as PortfolioItem[]).sort((a, b) => {
        const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
        const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
        return dateB - dateA;
      });
      setPortfolio(sortedPortfolio);
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
  } catch {
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <BrandLoader size={140} label="Carregando experiência..." />
      </div>
    );
  }
  // if (error) return <PageError message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <FloatingGlow />
      <SEO 
        title="Aluguel de Som, Luz e LED" 
        description="A melhor empresa de aluguel de som, iluminação e painel de LED em Belo Horizonte. Equipamentos profissionais para casamentos, festas e eventos corporativos."
      />
      
      {/* Dynamic Banner Carousel */}
      <div className="relative">
        <BannerCarousel />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </div>

      {/* Hero Section - Elevated premium feel */}
      <div className="relative py-12 sm:py-16 lg:py-20 mb-12 overflow-hidden">
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-20">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/30 blur-[150px] rounded-full" />
        </div>
        
        <div 
          className="relative text-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          {/* Sound Wave with more presence */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-30">
            <div className="flex items-center justify-between gap-0.5 h-32 z-0 w-full px-2">
              {[...Array(120)].map((_, i) => (
                <SoundBar key={i} />
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <h1 ref={heroTitleRef} className="text-4xl sm:text-5xl lg:text-7xl font-extrabold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70">
              Eleve seu Evento
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto font-light leading-relaxed">
              Equipamentos de alta performance e tecnologia de ponta para experiências sensoriais inesquecíveis.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 space-y-24 sm:space-y-32">
        {/* Kits em Destaque */}
        {kits && kits.length > 0 && (
          <section className="relative">
            <div className="text-center mb-16">
              <div className="inline-flex items-center px-4 py-2 bg-primary/10 border border-primary/20 backdrop-blur-md rounded-full text-primary font-semibold text-xs uppercase tracking-widest mb-4">
                👑 Premium Selection
              </div>
              <h2 ref={kitsTitleRef} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">Kits em Destaque</h2>
              <div className="w-24 h-1 bg-primary mx-auto rounded-full mb-6" />
            </div>
            
            <div className="relative group/scroll">
               <div className="flex overflow-x-auto pb-6 gap-6 snap-x snap-mandatory scrollbar-none hover:scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent transition-all w-full">
                  {kits.map((kit) => (
                    <div 
                      key={kit.id} 
                      className="min-w-[280px] w-[280px] md:min-w-[320px] md:w-[320px] snap-start flex-shrink-0 transition-transform duration-300 hover:scale-[1.01]"
                    >
                      <KitCard kit={kit} />
                    </div>
                  ))}
                  <div className="min-w-[1px] w-[1px] flex-shrink-0" />
               </div>
               <div className="absolute right-0 top-0 bottom-6 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none opacity-0 group-hover/scroll:opacity-100 transition-opacity" />
            </div>
          </section>
        )}

        {/* Equipamentos por Categoria */}
        <section className="relative">
          <div className="text-center mb-16">
             <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 border border-blue-500/20 backdrop-blur-md rounded-full text-blue-400 font-semibold text-xs uppercase tracking-widest mb-4">
                💎 Unlimited Possibilities
              </div>
            <h2 ref={equipmentsTitleRef} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">Arquitetura Sonora & Visual</h2>
            <div className="w-24 h-1 bg-blue-500 mx-auto rounded-full mb-6" />
          </div>

          <div className="flex flex-col gap-12">
             {loading ? (
                <div className="flex justify-center py-24">
                   <BrandLoader size={80} label="Sincronizando catálogo..." />
                </div>
             ) : (
                categories.map((category) => (
                  <CategoryEquipmentRow key={category.id} category={category} />
                ))
             )}
          </div>
        </section>

        {/* Services */}
        <section className="relative py-12">
          <ServiceRow />
        </section>

        {/* Portfólio */}
        {portfolio && portfolio.length > 0 && (
          <section className="relative">
            <div className="text-center mb-16">
              <div className="inline-flex items-center px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md rounded-full text-emerald-400 font-semibold text-xs uppercase tracking-widest mb-4">
                ✨ Success Stories
              </div>
              <h2 ref={portfolioTitleRef} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">Galeria de Experiências</h2>
              <div className="w-24 h-1 bg-emerald-500 mx-auto rounded-full mb-6" />
            </div>
            <div className="relative group/portfolio-scroll">
               <div className="flex overflow-x-auto pb-6 gap-6 snap-x snap-mandatory scrollbar-none hover:scrollbar-thin scrollbar-thumb-emerald-500/10 scrollbar-track-transparent transition-all w-full">
                  {portfolio.map((item) => (
                    <Link 
                      key={item.id} 
                      to={`/portfolio/${item.slug || item.id}`}
                      className="min-w-[300px] w-[300px] md:min-w-[400px] md:w-[400px] snap-start flex-shrink-0 transition-transform duration-300 hover:scale-[1.01]"
                    >
                      <PortfolioCard item={item} />
                    </Link>
                  ))}
                  <div className="min-w-[1px] w-[1px] flex-shrink-0" />
               </div>
               <div className="absolute right-0 top-0 bottom-6 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none opacity-0 group-hover/portfolio-scroll:opacity-100 transition-opacity" />
            </div>
          </section>
        )}

        {/* Depoimentos */}
        {(!reviewsLoading && reviews && reviews.length > 0) && (
          <section className="relative">
            <div className="text-center mb-16">
              <div className="inline-flex items-center px-4 py-2 bg-amber-500/10 border border-amber-500/20 backdrop-blur-md rounded-full text-amber-400 font-semibold text-xs uppercase tracking-widest mb-4">
                ⭐ Trusted by Leaders
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Vozes da Nossa Comunidade</h2>
              <div className="w-24 h-1 bg-amber-500 mx-auto rounded-full mb-6" />
            </div>
            <Grid columns={{ sm: 1, md: 2, lg: 3 }} gap={8}>
              {reviews.map((review) => (
                <TestimonialCard key={review.id} review={review} />
              ))}
            </Grid>
          </section>
        )}

        {/* Gemini Event Suggester - THE AI FEATURE */}
        <section className="relative pb-32">
          <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none opacity-40">
              <div className="w-[1000px] h-[600px] bg-sky-600/20 blur-[180px] rounded-full" />
          </div>
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 bg-sky-500/10 border border-sky-500/20 backdrop-blur-md rounded-full text-sky-400 font-semibold text-xs uppercase tracking-widest mb-4">
              � Neural Suggestion Engine
            </div>
            <h2 ref={aiTitleRef} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">Inteligência Criativa</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Deixe nossa inteligência artificial planejar a configuração ideal para sua visão única.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
             <GeminiEventSuggester />
          </div>
        </section>
      </div>
    </div>
  );
};
