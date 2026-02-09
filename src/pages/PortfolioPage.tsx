import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { asArray } from '../utils/normalize';
import type { PortfolioItem, PortfolioFilters } from '@/types';
import { PageLayout, PageLoading, PageEmpty } from '../components/layouts/PageLayout';
import { normalizeString } from '../utils/string';
import { SearchAndFilters, Grid, Skeleton, ListSkeleton } from '../components/ui/StandardComponents';
import { BrandLoader } from '../components/ui/BrandLoader';

const PortfolioListSkeleton = () => (
  <PageLayout
    title="Nossos Trabalhos"
    description="Reviva as melhores experiências que já proporcionamos."
  >
    <div className="mb-8">
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
    <ListSkeleton cards={6} />
  </PageLayout>
);
import { SEO } from '../components/SEO';

export const PortfolioPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  // error state removed to prevent blocking UI
  // const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [filters, setFilters] = useState<PortfolioFilters>({});

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const portfolioData = await apiFetch('/portfolio');
        const items = asArray<PortfolioItem>(portfolioData);
        setPortfolio(items);

        if (slug) {
          const item = items.find(i => i.slug === slug);
          if (item) setSelectedItem(item);
        }
      } catch (err) {
        console.error('Erro ao carregar portfolio:', err);
        // Não trava a tela, apenas loga o erro e deixa a lista vazia
        setPortfolio([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  // Filter logic
  const filteredPortfolio = useMemo(() => {
    let result = portfolio;

    if (filters.searchQuery) {
      const q = normalizeString(filters.searchQuery);
      result = result.filter((item) =>
        normalizeString(item.title).includes(q) || normalizeString(item.description).includes(q)
      );
    }

    return result;
  }, [portfolio, filters]);

  const handleFilterChange = (newFilters: Partial<PortfolioFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => setFilters({});
  
  const openModal = (item: PortfolioItem) => {
    setSelectedItem(item);
    navigate(`/portfolio/${item.slug || ''}`);
  };

  const closeModal = () => {
    setSelectedItem(null);
    navigate('/portfolio');
  };

  // UX: fechar modal com Esc e travar scroll do body
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedItem) {
        closeModal();
      }
    };
    if (selectedItem) {
      document.addEventListener('keydown', onKeyDown);
      // lock scroll
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', onKeyDown);
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [selectedItem]);

  if (loading) {
    return (
      <div className="relative">
        <BrandLoader fullScreen size={140} label="Revivendo momentos..." />
        <PortfolioListSkeleton />
      </div>
    );
  }

  // Error check removed to prevent blocking UI
  // if (error) { return <PageError ... />; }

  return (
    <PageLayout
      title="Nosso Portfólio"
      description="Explore nossos trabalhos realizados e se inspire para seu próximo evento."
    >
      <SEO 
        title="Portfólio de Eventos" 
        description="Veja fotos de casamentos, shows e eventos corporativos realizados com a estrutura da X Produções. Qualidade comprovada em Belo Horizonte."
      />
      <div className="w-full max-w-6xl mx-auto">
        <SearchAndFilters
          searchQuery={filters.searchQuery}
          onSearchChange={(query) => handleFilterChange({ searchQuery: query })}
          searchPlaceholder="Buscar por título ou descrição..."
          resultsCount={filteredPortfolio.length}
          itemLabel="projeto"
          showClearFilters={!!filters.searchQuery}
          onClearFilters={clearFilters}
          className="mb-8"
        />

        {filteredPortfolio.length > 0 ? (
          <Grid columns={{ sm: 1, md: 2, lg: 3 }} gap={8}>
            {filteredPortfolio.map((item) => (
              <div
                key={item.id}
                className="group cursor-pointer"
                onClick={() => openModal(item)}
              >
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={item.imageUrl || '/placeholder-portfolio.jpg'}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm line-clamp-3">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </Grid>
        ) : (
          <PageEmpty
            title="Nenhum projeto encontrado"
            message="Tente ajustar sua pesquisa para encontrar mais projetos."
            actionLabel="Limpar filtros"
            onAction={clearFilters}
            icon={
              <svg className="h-24 w-24 mx-auto mb-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />
        )}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-surface/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-card border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-surface/20 hover:bg-surface/40 rounded-full flex items-center justify-center text-foreground transition-colors"
              aria-label="Fechar modal"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="aspect-[16/9] overflow-hidden rounded-t-2xl">
              <img
                src={selectedItem.imageUrl || '/placeholder-portfolio.jpg'}
                alt={selectedItem.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-8">
              <h2 className="text-xl font-bold text-foreground mb-6 text-center">{selectedItem.title}</h2>
              <p className="text-muted-foreground text-base leading-relaxed mb-6 text-center">
                {selectedItem.description}
              </p>

              {selectedItem.media && selectedItem.media.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                  {selectedItem.media.filter(m => !m.isCover).map((media, index) => (
                    <div key={media.id || index} className="aspect-square overflow-hidden rounded-lg bg-surface/5">
                      {media.type === 'VIDEO' ? (
                          <video
                            src={media.url}
                            className="w-full h-full object-cover"
                            controls
                            playsInline
                            title={media.filename || 'Vídeo do evento'}
                          />
                      ) : (
                          <img
                            src={media.url}
                            alt={media.filename || `${selectedItem.title} - imagem ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                            onClick={() => window.open(media.url, '_blank')}
                          />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};
