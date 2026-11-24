
import { useState, useEffect } from 'react';
import { Banner } from '../../types/types';
import { bannerService } from '../../services/bannerService';
import { optimizeCloudinaryUrl } from '../../utils/imageUtils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const BannerCarousel = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Onda 2 da auditoria de 19/11 (F3-05): até a resposta de /banners/public, o carrossel reserva a própria altura. Antes
  // não desenhava nada (no SSR e antes da resposta) e, quando os banners chegavam, um bloco de até 500 px entrava no topo
  // e empurrava a página inteira. Só some se a lista vier vazia (ou a busca falhar).
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    bannerService
      .getPublicBanners()
      .then(setBanners)
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, []);

  // Onda 4 da auditoria de 19/11 (F3-07): o rodízio para com o mouse ou o foco do teclado sobre o banner e não roda com "reduzir
  // movimento" ligado no aparelho.
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (banners.length <= 1 || paused) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length, paused]);

  if (!loaded) {
    return <div className="w-full bg-muted h-[min(500px,60vh)]" aria-hidden="true" data-testid="banner-placeholder" />;
  }
  if (!banners.length) return null;

  const current = banners[currentIndex];

  const next = () => setCurrentIndex((prev) => (prev + 1) % banners.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);

  return (
    <div
      className="relative w-full overflow-hidden group bg-muted h-[min(500px,60vh)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false); }}
      data-testid="banner-carousel"
    >
      {/* Images */}
      <div className="relative w-full h-full">
         {/* Onda 4 da auditoria de 19/11 (F3-07): banner sem link é um <div> (o link "#" continuava focável e anunciado). */}
         {(() => {
           const content = (<>
           <picture>
             {current.mobileImageUrl && (
               <source 
                 media="(max-width: 768px)" 
                 srcSet={optimizeCloudinaryUrl(current.mobileImageUrl)} 
               />
             )}
             <img 
               src={optimizeCloudinaryUrl(current.imageUrl)} 
               alt={current.title} 
               className="w-full h-full object-cover transition-opacity duration-500"
               loading="eager" 
               fetchPriority="high"
             />
           </picture>
           {/* Overlay Gradient for text readability */}
           {/* bg-surface não existe: o gradiente sumia e o texto do tema ficava direto sobre a foto */}
           <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex items-end">
             <div className="p-6 md:p-12 text-white w-full max-w-7xl mx-auto">
               <h2 className="text-xl md:text-3xl font-bold mb-2 drop-shadow-md">{current.title}</h2>
               {current.description && (
                 <p className="text-sm md:text-lg max-w-3xl drop-shadow-md opacity-90">{current.description}</p>
               )}
             </div>
           </div>
         </>);
           return current.linkUrl
             ? <Link to={current.linkUrl} className="block w-full h-full">{content}</Link>
             : <div className="block w-full h-full">{content}</div>;
         })()}
      </div>

      {/* Navigation */}
      {banners.length > 1 && (
        <>
          <button 
            onClick={(e) => { e.preventDefault(); prev(); }}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-all"
            aria-label="Anterior"
          >
            <ChevronLeft size={24} className="md:w-8 md:h-8" />
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); next(); }}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-all"
            aria-label="Próximo"
          >
            <ChevronRight size={24} className="md:w-8 md:h-8" />
          </button>
          
          {/* Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.preventDefault(); setCurrentIndex(idx); }}
                className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all shadow-sm ${idx === currentIndex ? 'bg-foreground scale-125' : 'bg-foreground/40 hover:bg-foreground/70'}`}
                aria-label={`Ir para banner ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
