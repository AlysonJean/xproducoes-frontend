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
    <div {...rest} className="bg-card border border-border rounded-lg overflow-hidden shadow-lg group hover:shadow-xl transition-shadow">
      <div className="overflow-hidden h-64">
        <img
          src={safeImage(item.images, item.title)}
          alt={item.title || 'Evento do portfólio'}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
        />
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg text-foreground truncate">{item.title}</h3>
        <p className="text-muted-foreground text-sm h-10">{item.description}</p>
        <div className="mt-4 flex justify-end">
          <button className="text-sm text-primary hover:underline" disabled>
            Ver comentários
          </button>
        </div>
      </div>
    </div>
  );
};
