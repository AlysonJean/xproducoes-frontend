// Caminho do arquivo: frontend/src/components/PortfolioCard.tsx

import type { PortfolioCardProps } from '../../types/types';

function safeImage(urls?: string[], title?: string): string {
  const invalidHosts = ['via.placeholder.com', 'cdn.exemplo.com'];
  const first = urls?.find(Boolean) || '';
  const fallback = `https://placehold.co/800x450/0f172a/ffffff?text=${encodeURIComponent(title || 'Portf%C3%B3lio')}`;
  if (!first) return fallback;
  try {
    const u = new URL(first, window.location.origin);
    // Bloquear uploads locais e hosts inválidos
    if (u.pathname.startsWith('/uploads') || invalidHosts.includes(u.hostname)) return fallback;
    return u.toString();
  } catch {
    return fallback;
  }
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({ item, ...rest }) => {
  return (
    <div {...rest} className="bg-card border border-border rounded-lg overflow-hidden shadow-lg group hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 cursor-pointer">
      <div className="overflow-hidden h-64 sm:h-72 md:h-80 relative">
        <img
          src={safeImage(item.images, item.title)}
          alt={item.title || 'Evento do portfólio'}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-end">
          <div className="p-4 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <h3 className="font-bold text-lg truncate">{item.title}</h3>
          </div>
        </div>
      </div>
    </div>
  );
};
