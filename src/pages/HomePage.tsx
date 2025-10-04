// Caminho do arquivo: frontend/src/pages/HomePage.tsx

import { useState, useEffect, useCallback } from 'react';
import { useRevealOnView } from '../hooks/useRevealOnView';
import { EquipmentCard } from '../components/ui/EquipmentCard';
import { KitCard } from '../components/ui/KitCard';
import { PortfolioCard } from '../components/ui/PortfolioCard';
import { SearchFilters } from '../components/ui/SearchFilters';
import { Pagination } from '../components/ui/Pagination';
import { apiFetch } from '../services/api';
import type { Equipment, Category, Kit, PortfolioItem } from '../types/types';
import { transformEquipment } from '../utils/transformEquipment';
import LoadingSpinner from '../components/LoadingSpinner';
import { GeminiEventSuggester } from '../components/ui/GeminiEventSuggester';
import { PageLoading, PageError } from '../components/layouts/PageLayout';
import { Grid } from '../components/ui/StandardComponents';
import { TestimonialCard } from '../components/ui/TestimonialCard';

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

export const HomePage = () => {
  const { ref: heroTitleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const { ref: kitsTitleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const { ref: equipmentsTitleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const { ref: portfolioTitleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  // Seção de avaliações/depoimentos
  const { ref: aiTitleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  // Estado de avaliações públicas aprovadas
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12,
  });
  const [filters, setFilters] = useState({
    searchTerm: '',
    categoryId: '',
    minPrice: '',
    maxPrice: '',
    sortBy: '',
  });

  const debouncedFilters = useDebounce(JSON.stringify(filters), 500);

  const fetchEquipments = useCallback(async (searchFilters: typeof filters, page: number = 1) => {
    setEquipmentLoading(true);
    try {
      const queryParams = new URLSearchParams();

      if (searchFilters.searchTerm) queryParams.append('query', searchFilters.searchTerm);
      if (searchFilters.categoryId) queryParams.append('categoryId', searchFilters.categoryId);
      if (searchFilters.minPrice) queryParams.append('minPrice', searchFilters.minPrice);
      if (searchFilters.maxPrice) queryParams.append('maxPrice', searchFilters.maxPrice);
      if (searchFilters.sortBy) queryParams.append('sortBy', searchFilters.sortBy);
      queryParams.append('page', page.toString());
      queryParams.append('limit', '12');

  const response = await apiFetch(`/api/equipments/search?${queryParams.toString()}`);
      
      // Verificar se a resposta tem o formato esperado { data, pagination } ou é um array direto
      let equipmentsData: Equipment[];
      let paginationData;
      
      if (Array.isArray(response)) {
        // Resposta é array direto - usar fallback para paginação
        equipmentsData = response;
        paginationData = {
          currentPage: 1,
          totalPages: 1,
          totalItems: response.length,
          itemsPerPage: response.length
        };
      } else if (response && (response as any).data && Array.isArray((response as any).data)) {
        // Resposta tem formato { data, pagination }
        equipmentsData = (response as any).data;
        paginationData = (response as any).pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: (response as any).data.length,
          itemsPerPage: (response as any).data.length
        };
      } else {
        // Fallback - tentar usar resposta direta
        equipmentsData = [];
        paginationData = {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 12
        };
        console.warn('Formato de resposta inesperado:', response);
      }

      const transformedEquipments = equipmentsData.map((eq: Equipment) => transformEquipment(eq));
      setEquipments(transformedEquipments);
      setPagination(paginationData);
    } catch (error) {
      console.error('Erro ao buscar equipamentos:', error);
      setEquipments([]);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 12
      });
    } finally {
      setEquipmentLoading(false);
    }
  }, []);

  const fetchPageData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
  const [catsData, kitsData, portfolioData] = await Promise.all([
  apiFetch('/api/categories'),
  apiFetch('/api/kits?limit=4'),
  apiFetch('/api/portfolio?limit=3'),
      ]);

  setCategories(catsData as Category[]);
  setKits(kitsData as Kit[]);
  setPortfolio(portfolioData as PortfolioItem[]);
    } catch (err) {
      setError('Erro ao carregar dados da API. Tente novamente mais tarde.');
    } finally {
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
  data = await apiFetch('/api/reviews/recent?limit=8');
      } catch {
        // fallback
  data = await apiFetch('/api/reviews/public');
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
  }, [fetchPageData]);

  // Busca equipamentos quando os filtros mudarem
  useEffect(() => {
    if (categories.length > 0) {
      const parsedFilters = JSON.parse(debouncedFilters);
      fetchEquipments(parsedFilters, 1);
      setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }
  }, [debouncedFilters, categories.length, fetchEquipments]);

  const handleFiltersChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  const handlePageChange = (page: number) => {
    const parsedFilters = JSON.parse(debouncedFilters);
    fetchEquipments(parsedFilters, page);
    setPagination((prev) => ({ ...prev, currentPage: page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <PageLoading message="Carregando página inicial..." />;
  if (error) return <PageError message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <div className="relative py-16 sm:py-20 lg:py-24 xl:py-28 2xl:py-32 mb-16 sm:mb-20 lg:mb-24 xl:mb-28 2xl:mb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 pointer-events-none bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"></div>
        <div className="relative text-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <h1 ref={heroTitleRef} className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold mb-6 heading-elegant">
            Equipamentos Profissionais
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl text-muted-foreground mb-8 max-w-5xl mx-auto">
            Transforme seus eventos em experiências inesquecíveis com nossa tecnologia de ponta
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 space-y-16 sm:space-y-20 lg:space-y-24 xl:space-y-28 2xl:space-y-32">
        {/* Kits em Destaque */}
        {kits && kits.length > 0 && (
          <section className="relative">
            <div className="text-center mb-12 sm:mb-14 lg:mb-16 xl:mb-18 2xl:mb-20">
              <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full text-primary font-medium text-sm mb-4">
                ⭐ Soluções Completas
              </div>
              <h2 ref={kitsTitleRef} className="text-4xl font-bold text-foreground mb-4 heading-elegant">Kits em Destaque</h2>
              <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl text-muted-foreground max-w-3xl mx-auto">
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

        {/* Equipamentos */}
        <section className="relative">
          <div className="text-center mb-12 sm:mb-14 lg:mb-16 xl:mb-18 2xl:mb-20">
            <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full text-primary font-medium text-sm mb-4">
              🎯 Catálogo Completo
            </div>
            <h2 ref={equipmentsTitleRef} className="text-4xl font-bold text-foreground mb-4 heading-elegant">Nossos Equipamentos</h2>
            <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl text-muted-foreground max-w-3xl mx-auto">
              Equipamentos profissionais de alta qualidade para todos os tipos de eventos e produções
            </p>
          </div>

          <div className="mb-10 sm:mb-12 lg:mb-14 xl:mb-16 2xl:mb-18">
            <SearchFilters categories={categories} onFiltersChange={handleFiltersChange} />
          </div>

          {equipmentLoading ? (
            <div className="flex justify-center items-center py-16 sm:py-18 lg:py-20 xl:py-22 2xl:py-24">
              <LoadingSpinner size="lg" label="Carregando equipamentos..." />
            </div>
          ) : equipments && equipments.length > 0 ? (
            <>
              <Grid columns={{ sm: 1, md: 2, lg: 3, xl: 4, '2xl': 4, '3xl': 5, '4xl': 6, '5xl': 6 }} gap={8}>
                {equipments.map((eq) => (
                  <div key={eq.id} className="group">
                    <EquipmentCard equipment={eq} />
                  </div>
                ))}
              </Grid>

              {pagination.totalPages > 1 && (
                <div className="mt-10 sm:mt-12 lg:mt-14 xl:mt-16 2xl:mt-18 flex justify-center">
                  <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.totalItems}
                    itemsPerPage={pagination.itemsPerPage}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 sm:py-18 lg:py-20 xl:py-22 2xl:py-24">
              <div className="bg-gradient-to-r from-muted/30 to-muted/20 rounded-2xl border border-border/50 p-12 sm:p-14 lg:p-16 xl:p-18 2xl:p-20 max-w-lg mx-auto">
                <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-18 lg:h-18 xl:w-20 xl:h-20 mx-auto mb-6 bg-gradient-to-br from-muted to-muted/80 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-semibold text-foreground mb-3">
                  Nenhum equipamento encontrado
                </h3>
                <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-muted-foreground">
                  Tente ajustar sua pesquisa ou filtros para encontrar mais equipamentos.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Portfólio */}
        {portfolio && portfolio.length > 0 && (
          <section className="relative">
            <div className="text-center mb-12 sm:mb-14 lg:mb-16 xl:mb-18 2xl:mb-20">
              <div className="inline-flex items-center px-4 py-2 bg-success/10 rounded-full text-success font-medium text-sm mb-4">
                📸 Galeria de Eventos
              </div>
              <h2 ref={portfolioTitleRef} className="text-4xl font-bold text-foreground mb-4 heading-elegant">Galeria de Eventos</h2>
              <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl text-muted-foreground max-w-3xl mx-auto">
                Confira algumas imagens dos eventos incríveis que tivemos o prazer de realizar com nossos equipamentos
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
            <div className="text-center mb-12 sm:mb-14 lg:mb-16 xl:mb-18 2xl:mb-20">
              <div className="inline-flex items-center px-4 py-2 bg-amber-500/10 rounded-full text-amber-600 font-medium text-sm mb-4">
                💬 Clientes Satisfeitos
              </div>
              <h2 className="text-4xl font-bold text-foreground mb-4 heading-elegant">O que dizem sobre nós</h2>
              <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl text-muted-foreground max-w-3xl mx-auto">
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
            <LoadingSpinner label="Carregando depoimentos..." />
          </div>
        )}

        {/* Gemini Event Suggester */}
        <section className="relative">
          <div className="text-center mb-12 sm:mb-14 lg:mb-16 xl:mb-18 2xl:mb-20">
            <div className="inline-flex items-center px-4 py-2 bg-purple-500/10 rounded-full text-purple-600 font-medium text-sm mb-4">
              🤖 IA Personalizada
            </div>
            <h2 ref={aiTitleRef} className="text-4xl font-bold text-foreground mb-4 heading-elegant">Sugestões Inteligentes</h2>
            <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl text-muted-foreground max-w-3xl mx-auto">
              Nossa IA analisa suas necessidades e sugere os equipamentos ideais para seu evento
            </p>
          </div>
          <GeminiEventSuggester />
        </section>
      </div>
    </div>
  );
};
