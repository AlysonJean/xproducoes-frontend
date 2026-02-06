
import { useState, useEffect } from 'react';
import { Banner } from '../../types/types';
import { bannerService } from '../../services/bannerService';
import { optimizeCloudinaryUrl } from '../../utils/imageUtils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const BannerCarousel = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    bannerService.getPublicBanners().then(setBanners).catch(console.error);
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (!banners.length) return null;

  const current = banners[currentIndex];

  const next = () => setCurrentIndex((prev) => (prev + 1) % banners.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);

  return (
    <div className="relative w-full overflow-hidden group bg-black h-[min(500px,60vh)]">
      {/* Images */}
      <div className="relative w-full h-full">
         <Link to={current.linkUrl || '#'} className={`block w-full h-full ${!current.linkUrl ? 'pointer-events-none' : ''}`}>
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
           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end">
             <div className="p-6 md:p-12 text-white w-full max-w-7xl mx-auto">
               <h2 className="text-xl md:text-3xl font-bold mb-2 drop-shadow-md">{current.title}</h2>
               {current.description && (
                 <p className="text-sm md:text-lg max-w-3xl drop-shadow-md opacity-90">{current.description}</p>
               )}
             </div>
           </div>
         </Link>
      </div>

      {/* Navigation */}
      {banners.length > 1 && (
        <>
          <button 
            onClick={(e) => { e.preventDefault(); prev(); }}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/60 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
            aria-label="Anterior"
          >
            <ChevronLeft size={24} className="md:w-8 md:h-8" />
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); next(); }}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/60 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
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
                className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all shadow-sm ${idx === currentIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/70'}`}
                aria-label={`Ir para banner ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
