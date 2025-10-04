import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../services/api';
import { asArray } from '../utils/normalize';
import type { PortfolioItem, PortfolioFilters } from '@/types';
import { PageLayout, PageLoading, PageError, PageEmpty } from '../components/layouts/PageLayout';
import { normalizeString } from '../utils/string';
import { SearchAndFilters, Grid } from '../components/ui/StandardComponents';

export const PortfolioPage: React.FC = () => {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [filters, setFilters] = useState<PortfolioFilters>({});

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
  const portfolioData = await apiFetch('/api/portfolio');
  setPortfolio(asArray<PortfolioItem>(portfolioData));
      } catch (err) {
        console.error('Erro ao carregar portfolio:', err);
        setError('Erro ao carregar portfólio. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
  const openModal = (item: PortfolioItem) => setSelectedItem(item);
  const closeModal = () => setSelectedItem(null);

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
    return <PageLoading message="Carregando portfólio..." />;
  }

  if (error) {
    return <PageError message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <PageLayout
      title="Nosso Portfólio"
      description="Explore nossos trabalhos realizados e se inspire para seu próximo evento."
    >
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-card border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-colors"
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

              {selectedItem.images && selectedItem.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                  {selectedItem.images.map((image, index) => (
                    <div key={index} className="aspect-square overflow-hidden rounded-lg">
                      <img
                        src={image}
                        alt={`${selectedItem.title} - imagem ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
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
