import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { asArray } from '../utils/normalize';
import type { PortfolioItem, PortfolioFilters } from '@/types';
import { PageLayout, PageEmpty } from '../components/layouts/PageLayout';
import { normalizeString } from '../utils/string';
import { SearchAndFilters, Grid } from '../components/ui/StandardComponents';
import { BrandLoader } from '../components/ui/BrandLoader';
import { SEO } from '../components/SEO';
import { logger } from '../utils/logger';

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
        logger.error('Erro ao carregar portfolio:', 'PortfolioPage', err);
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
  
  const openModal = useCallback((item: PortfolioItem) => {
    setSelectedItem(item);
    navigate(`/portfolio/${item.slug || ''}`);
  }, [navigate]);

  const closeModal = useCallback(() => {
    setSelectedItem(null);
    navigate('/portfolio');
  }, [navigate]);

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
  }, [selectedItem, closeModal]);

  if (loading) {
    return (
      <PageLayout 
        title="Nosso Portfólio" 
        description="Revivendo os melhores momentos produzidos pela X Produções."
      >
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Revivendo momentos..." />
        </div>
      </PageLayout>
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
        {/* Strategic Instagram Call-to-Action */}
        <div className="mt-24 relative group no-print">
          {/* Decorative background elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-emerald-500/5 rounded-[60px] blur-3xl" />
          
          <div className="relative overflow-hidden rounded-[40px] bg-zinc-950 border border-white/5 p-8 lg:p-16 shadow-2xl">
            {/* Glossy overlay */}
            <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-emerald-600/10 via-emerald-600/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  No Ar: Bastidores e Montagens
                </div>
                
                <h2 className="text-4xl lg:text-6xl font-black text-white leading-[1.1] mb-8">
                  Quer ver o <br />
                  <span className="text-emerald-500 underline decoration-emerald-500/30 underline-offset-8">show completo?</span>
                </h2>
                
                <p className="text-zinc-400 text-lg lg:text-xl max-w-xl font-medium leading-relaxed mb-10">
                  Nem todos os eventos conseguem chegar ao site a tempo. Nossos bastidores e montagens acontecem agora mesmo no nosso Instagram. 
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6">
                  <a 
                    href="https://www.instagram.com/x_producoeseventos" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group/btn relative px-10 py-5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-2xl transition-all duration-500 shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-1.5 active:scale-95 flex items-center gap-4 overflow-hidden"
                  >
                    <span className="relative z-10">Seguir @x_producoeseventos</span>
                    <svg className="w-5 h-5 relative z-10 group-hover/btn:translate-x-2 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    {/* Interactive shine effect */}
                    <div className="absolute inset-x-0 top-0 h-full w-24 bg-white/20 -skew-x-[45deg] -translate-x-[200%] group-hover/btn:translate-x-[400%] transition-transform duration-1000 ease-in-out" />
                  </a>
                  
                  <div className="flex flex-col items-center sm:items-start gap-2">
                    <div className="flex -space-x-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-zinc-950 bg-zinc-800 ring-2 ring-emerald-500/10 flex items-center justify-center overflow-hidden transition-transform hover:scale-110 hover:z-20 cursor-pointer">
                          <img src={`https://i.pravatar.cc/100?img=${i+20}`} alt="Seguidor" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">+10k seguindo a X</span>
                  </div>
                </div>
              </div>
              
              <div className="w-full lg:w-[450px] aspect-square relative flex items-center justify-center">
                {/* Abstract Instagram Post Stack */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 bg-zinc-900 rounded-[32px] border border-white/10 rotate-[-15deg] shadow-2xl overflow-hidden scale-90 lg:scale-100 opacity-40 group-hover:rotate-[-20deg] transition-transform duration-700">
                   <img src="https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=400&q=80" alt="Evento" className="w-full h-full object-cover" />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 bg-zinc-900 rounded-[32px] border border-emerald-500/20 rotate-[10deg] shadow-2xl overflow-hidden group-hover:rotate-[15deg] transition-transform duration-700">
                   <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=400&q=80" alt="Show" className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-pull rounded-full flex items-center justify-center border border-white/20">
                        <svg className="w-8 h-8 text-white fill-white" viewBox="0 0 24 24">
                          <path d="M12.017 0C8.396 0 7.931.013 6.714.058 5.498.103 4.677.301 3.958.585a6.022 6.022 0 0 0-2.188 1.424A6.022 6.022 0 0 0 .346 3.998c-.284.72-.482 1.54-.527 2.756C-.026 7.97-.013 8.435-.013 12.056c0 3.621.013 4.086.058 5.303.045 1.216.243 2.036.527 2.756.284.721.665 1.356 1.424 2.188a6.022 6.022 0 0 0 2.188 1.424c.72.284 1.54.482 2.756.527 1.217.045 1.682.058 5.303.058 3.621 0 4.086-.013 5.303-.058 1.216-.045 2.036-.243 2.756-.527a6.022 6.022 0 0 0 2.188-1.424 6.022 6.022 0 0 0 1.424-2.188c.284-.72.482-1.54.527-2.756.045-1.217.058-1.682.058-5.303 0-3.621-.013-4.086-.058-5.303-.045-1.216-.243-2.036-.527-2.756a6.022 6.022 0 0 0-1.424-2.188A6.022 6.022 0 0 0 18.973.585c-.72-.284-1.54-.482-2.756-.527C15 .013 14.535 0 12.017 0z" />
                        </svg>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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

              {/* Modal Instagram Feed Hook */}
              <div className="mt-12 pt-8 border-t border-border/50 text-center">
                <p className="text-muted-foreground text-sm mb-4">Gostou deste projeto? Veja os bastidores deste e outros eventos no nosso Instagram.</p>
                <a 
                  href="https://www.instagram.com/x_producoeseventos" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-emerald-500 font-bold hover:text-emerald-400 transition-colors"
                >
                  Continuar vendo no Instagram
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};
