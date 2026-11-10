import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ImageIcon } from 'lucide-react';
import { apiFetch } from '../services/api';
import { asArray } from '../utils/normalize';
import type { PortfolioItem, PortfolioFilters } from '@/types';
import { PageLayout, PageEmpty, PageError } from '../components/layouts/PageLayout';
import { normalizeString } from '../utils/string';
import { SearchAndFilters, Grid, Modal, buttonVariants } from '../components/ui/StandardComponents';
import { BrandLoader } from '../components/ui/BrandLoader';
import { SEO } from '../components/SEO';
import { logger } from '../utils/logger';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../data/site';
import { InstagramFeed } from '../components/InstagramFeed';
import { InstagramVideo } from '../components/InstagramVideo';

const PAGE_TITLE = 'Nosso Portfólio';
const PAGE_DESCRIPTION = 'Explore nossos trabalhos realizados e se inspire para seu próximo evento.';

const PortfolioSEO = () => (
  <SEO
    title="Portfólio de Eventos"
    description="Veja fotos de casamentos, shows e eventos corporativos realizados com a estrutura da X Produções em Belo Horizonte."
  />
);

// Achado: o fallback apontava para /placeholder-portfolio.jpg, que não existe em public/ (imagem
// quebrada). Sem foto, mostra um bloco neutro com ícone.
const PortfolioImage = ({ src, alt, className }: { src?: string | null; alt: string; className: string }) =>
  src ? (
    <img src={src} alt={alt} className={className} />
  ) : (
    <div className="w-full h-full bg-muted flex items-center justify-center" role="img" aria-label={`${alt} (sem foto)`}>
      <ImageIcon className="w-12 h-12 text-muted-foreground" aria-hidden="true" />
    </div>
  );

export const PortfolioPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [filters, setFilters] = useState<PortfolioFilters>({});

  // Achado: o erro de API era engolido e a tela dizia "Nenhum projeto encontrado". Agora há
  // estado de erro com retry.
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const portfolioData = await apiFetch('/portfolio');
      const items = asArray<PortfolioItem>(portfolioData);
      setPortfolio(items);

      if (slug) {
        const item = items.find(i => i.slug === slug);
        if (item) setSelectedItem(item);
      }
    } catch (err) {
      logger.error('Erro ao carregar portfolio:', 'PortfolioPage', err);
      setError('Erro ao carregar o portfólio. Tente novamente.');
      setPortfolio([]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Esc, trava de rolagem e foco preso agora vêm do <Modal> padrão.
  const closeModal = useCallback(() => {
    setSelectedItem(null);
    navigate('/portfolio');
  }, [navigate]);

  // Achado (pedido do dono de 09/11/2026, Instagram): sem trilha própria, o Breadcrumbs montava os rótulos a partir do
  // endereço, e /portfolio/camarote-no-estadio-mineirao virava "Portfolio > Camarote no estadio mineirao" (sem
  // acentos, inclusive no BreadcrumbList do JSON-LD). Agora a trilha usa o título do projeto; enquanto ele carrega,
  // fica só "Portfólio" (o texto do endereço nunca aparece).
  const breadcrumbs =
    slug && selectedItem && selectedItem.slug === slug
      ? [{ label: 'Portfólio', path: '/portfolio' }, { label: selectedItem.title }]
      : slug
        ? [{ label: 'Portfólio', path: '/portfolio' }]
        : [{ label: 'Portfólio' }];

  const coverVideo = selectedItem?.media?.find((m) => m.isCover && m.embedUrl);

  if (loading) {
    return (
      <PageLayout title={PAGE_TITLE} description={PAGE_DESCRIPTION} breadcrumbs={breadcrumbs}>
        <PortfolioSEO />
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando portfólio..." />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title={PAGE_TITLE} description={PAGE_DESCRIPTION} breadcrumbs={breadcrumbs}>
        <PortfolioSEO />
        <PageError message={error} onRetry={fetchData} />
      </PageLayout>
    );
  }

  return (
    <PageLayout title={PAGE_TITLE} description={PAGE_DESCRIPTION} breadcrumbs={breadcrumbs}>
      <PortfolioSEO />
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
              // Achado: era um <div onClick> (sem teclado nem papel de link). Agora é um link real
              // para /portfolio/:slug que abre o detalhe no modal.
              <Link
                key={item.id}
                to={`/portfolio/${item.slug || ''}`}
                onClick={(e) => {
                  // Ctrl/Cmd/Shift ou botão do meio: deixa o navegador abrir em nova aba.
                  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  openModal(item);
                }}
                className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <div className="aspect-[4/3] overflow-hidden">
                    <PortfolioImage
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </h2>
                    <p className="text-muted-foreground text-sm line-clamp-3">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </Grid>
        ) : (
          <PageEmpty
            title="Nenhum projeto encontrado"
            message="Tente ajustar sua pesquisa para encontrar mais projetos."
            actionLabel="Limpar filtros"
            onAction={clearFilters}
            icon={
              <svg className="h-24 w-24 mx-auto mb-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />
        )}

        {/* Pedido do dono de 09/11/2026 (Instagram): as 12 publicações mais recentes do Instagram, abaixo dos
            projetos. Sem publicações (ou se a busca falhar) a seção não aparece. */}
        <InstagramFeed limit={12} className="mt-24" />

        {/* Chamada para o Instagram.
            Achado: o bloco tinha avatares de banco de imagens (i.pravatar.cc) com "+10k seguindo a
            X", fotos de banco (Unsplash) como se fossem eventos da casa e um selo "No Ar" piscando
            — dados inventados, removidos. As cores fixas (zinco/esmeralda) viraram tokens. */}
        <div className="mt-24 no-print">
          <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-8 lg:p-16 shadow-2xl">
            <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-primary/10 via-primary/5 to-transparent pointer-events-none" aria-hidden="true" />

            <div className="relative z-10 max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-8">
                Bastidores e montagens
              </div>

              <h2 className="text-4xl lg:text-6xl font-black text-foreground leading-tight mb-8">
                Quer ver o{' '}
                <span className="text-primary underline decoration-primary/30 underline-offset-8">show completo?</span>
              </h2>

              <p className="text-muted-foreground text-lg lg:text-xl font-medium leading-relaxed mb-10">
                Nem todos os eventos conseguem chegar ao site a tempo. Nossos bastidores e montagens estão no Instagram.
              </p>

              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ size: 'lg', className: 'group/btn normal-case tracking-normal' })}
              >
                Seguir {INSTAGRAM_HANDLE}
                <svg className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Achado: modal feito à mão (sem role=dialog, sem foco preso) e com fundo `bg-surface/60`,
          token que não existe (overlay sem cor). Agora é o <Modal> padrão. */}
      <Modal
        isOpen={!!selectedItem}
        onClose={closeModal}
        title={selectedItem?.title}
        size="lg"
      >
        {selectedItem && (
          <>
            {/* Projeto criado de um vídeo do Instagram: a capa é o próprio vídeo (a galeria abaixo não mostra a capa). */}
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl -mt-2">
              {coverVideo ? (
                <InstagramVideo
                  permalink={coverVideo.embedUrl}
                  imageUrl={coverVideo.url || selectedItem.imageUrl}
                  label={selectedItem.title}
                  imageWidth={1000}
                />
              ) : (
                <PortfolioImage
                  src={selectedItem.imageUrl}
                  alt={selectedItem.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <p className="text-muted-foreground text-base leading-relaxed mt-6 text-center">
              {selectedItem.description}
            </p>

            {selectedItem.media && selectedItem.media.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                {selectedItem.media.filter(m => !m.isCover).map((media, index) => (
                  <div key={media.id || index} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                    {/* Pedido do dono de 09/11/2026 (Instagram): mídia com embedUrl é um vídeo do Instagram; a url é a
                        capa (imagem) e o vídeo toca no player do Instagram depois do clique. */}
                    {media.embedUrl ? (
                      <InstagramVideo
                        permalink={media.embedUrl}
                        imageUrl={media.url}
                        label={media.filename || `${selectedItem.title} - vídeo ${index + 1}`}
                      />
                    ) : media.type === 'VIDEO' ? (
                      <video
                        src={media.url}
                        className="w-full h-full object-cover"
                        controls
                        playsInline
                        title={media.filename || 'Vídeo do evento'}
                      />
                    ) : (
                      <a
                        href={media.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Abrir ${media.filename || `imagem ${index + 1}`} em nova aba`}
                      >
                        <img
                          src={media.url}
                          alt={media.filename || `${selectedItem.title} - imagem ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-12 pt-8 border-t border-border/50 text-center">
              <p className="text-muted-foreground text-sm mb-4">Gostou deste projeto? Veja os bastidores deste e outros eventos no nosso Instagram.</p>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary font-bold hover:underline underline-offset-4 transition-colors"
              >
                Continuar vendo no Instagram
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </>
        )}
      </Modal>
    </PageLayout>
  );
};
