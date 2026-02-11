// Caminho do arquivo: frontend/src/components/PortfolioCard.tsx

import type { PortfolioCardProps } from '../../types/types';
import { PlayCircle, Star } from 'lucide-react';
import { OptimizedImage } from '../../components/ui/OptimizedImage';

function getMediaSource(url?: string, title?: string): { src: string, isVideo: boolean, poster?: string } {
  const fallback = `https://placehold.co/800x450/0f172a/ffffff?text=${encodeURIComponent(title || 'Portf%C3%B3lio')}`;
  
  if (!url) return { src: fallback, isVideo: false };

  try {
    const isVideo = url.match(/\.(mp4|webm|mov)$/i) !== null;
    
    // Cloudinary video thumbnail hack
    if (isVideo && url.includes('cloudinary.com')) {
       // Replace extension with .jpg for poster
       const poster = url.replace(/\.(mp4|webm|mov)$/i, '.jpg');
       return { src: url, isVideo: true, poster }; 
    }

    return { src: url, isVideo: false };
  } catch {
    return { src: fallback, isVideo: false };
  }
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({ item, ...rest }) => {
  const { src, isVideo, poster } = getMediaSource(item.imageUrl, item.title);

  return (
    <div {...rest} className="bg-card border border-border rounded-lg overflow-hidden shadow-lg group hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 cursor-pointer h-full">
      <div className="overflow-hidden h-64 sm:h-72 md:h-80 relative">
        {isVideo ? (
            <div className="relative w-full h-full">
                <video
                    src={src}
                    poster={poster}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    muted
                    loop
                    playsInline
                    onMouseOver={e => e.currentTarget.play()}
                    onMouseOut={e => e.currentTarget.pause()}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity duration-300">
                    <div className="bg-surface/40 rounded-full p-3 backdrop-blur-sm">
                      <PlayCircle className="w-10 h-10 text-foreground" />
                    </div>
                </div>
            </div>
        ) : (
            <OptimizedImage
            src={src}
            alt={item.title || 'Evento do portfólio'}
            className="w-full h-full transform group-hover:scale-110 transition-transform duration-500"
            objectFit="cover"
            width={600}
            height={400}
            />
        )}

        {item.isPinned && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm shadow-lg shadow-emerald-500/20 border border-white/20">
                <Star className="w-3 h-3 fill-white" />
                Destaque
            </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-surface/80 via-surface/20 to-transparent opacity-100 transition-opacity duration-300 flex items-end">
          <div className="p-4 text-foreground w-full">
            <h3 className="font-bold text-lg truncate mb-1">{item.title}</h3>
            {item.description && <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
