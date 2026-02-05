// Caminho do arquivo: frontend/src/components/PortfolioCard.tsx

import type { PortfolioCardProps } from '../../types/types';
import { PlayCircle } from 'lucide-react';

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
                    <div className="bg-black/40 rounded-full p-3 backdrop-blur-sm">
                        <PlayCircle className="w-10 h-10 text-white" />
                    </div>
                </div>
            </div>
        ) : (
            <img
            src={src}
            alt={item.title || 'Evento do portfólio'}
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
            />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-100 transition-opacity duration-300 flex items-end">
          <div className="p-4 text-white w-full">
            <h3 className="font-bold text-lg truncate mb-1">{item.title}</h3>
            {item.description && <p className="text-xs text-white/80 line-clamp-1">{item.description}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
