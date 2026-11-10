import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { logger } from '../utils/logger';
import {
  formatInstagramDate,
  readPublicInstagramFeed,
  safeInstagramPermalink,
  summarizeCaption,
  type PublicInstagramPost,
} from '../utils/instagram';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../data/site';
import { OptimizedImage } from './ui/OptimizedImage';
import { Skeleton } from './ui/Skeleton';
import { InstagramVideo } from './InstagramVideo';
import { cn } from '../utils/cn';

interface InstagramFeedProps {
  /** Quantas publicações mostrar (a rota aceita de 1 a 24). */
  limit: number;
  title?: string;
  /** Mostra também o link para a página do Portfólio (bloco da página inicial). */
  showPortfolioLink?: boolean;
  className?: string;
}

type FeedState = { status: 'loading' } | { status: 'ready'; posts: PublicInstagramPost[] } | { status: 'hidden' };

const linkClass =
  'inline-flex items-center gap-1 font-semibold text-primary hover:underline underline-offset-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const PostCard = ({ post }: { post: PublicInstagramPost }) => {
  const date = formatInstagramDate(post.postedAt);
  const summary = summarizeCaption(post.caption);
  const postUrl = safeInstagramPermalink(post.permalink);
  const label = summary || (date ? `Publicação de ${date}` : 'Publicação do Instagram');
  const isVideo = post.isVideo === true || post.mediaType === 'VIDEO';

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {isVideo ? (
          <InstagramVideo permalink={post.permalink} imageUrl={post.imageUrl as string} label={label} />
        ) : (
          <OptimizedImage
            src={post.imageUrl as string}
            alt={label}
            fill
            width={600}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {date && (
          <time dateTime={post.postedAt} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {date}
          </time>
        )}
        {summary && <p className="line-clamp-3 text-sm leading-relaxed text-foreground">{summary}</p>}
        {postUrl && (
          <a href={postUrl} target="_blank" rel="noopener noreferrer" className={cn(linkClass, 'mt-auto pt-1 text-sm')}>
            Ver no Instagram
            <span className="sr-only">{date ? ` (publicação de ${date}, abre em nova aba)` : ' (abre em nova aba)'}</span>
          </a>
        )}
      </div>
    </article>
  );
};

/**
 * Pedido do dono de 09/11/2026 (Instagram): as publicações mais recentes de @x_producoeseventos, importadas pelo
 * servidor, na página do Portfólio (12) e na página inicial (6). Busca no navegador, como o PortfolioPage (no
 * servidor do site só sai o esqueleto de carregamento). Sem publicações, ou se a busca falhar, a seção inteira some:
 * o site público nunca mostra caixa de erro. Fotos e capas vêm do Cloudinary; nada é pedido ao Instagram até o
 * visitante clicar para assistir a um vídeo.
 */
export const InstagramFeed = ({ limit, title = 'Do nosso Instagram', showPortfolioLink = false, className }: InstagramFeedProps) => {
  const [state, setState] = useState<FeedState>({ status: 'loading' });
  const headingId = useId();

  useEffect(() => {
    let active = true;
    apiFetch<unknown>(`/instagram/posts?limit=${limit}`)
      .then((data) => {
        if (!active) return;
        const posts = readPublicInstagramFeed(data).posts.slice(0, limit);
        setState(posts.length > 0 ? { status: 'ready', posts } : { status: 'hidden' });
      })
      .catch((err: unknown) => {
        if (!active) return;
        logger.warn('Publicações do Instagram indisponíveis; a seção fica escondida.', 'InstagramFeed', err);
        setState({ status: 'hidden' });
      });
    return () => {
      active = false;
    };
  }, [limit]);

  if (state.status === 'hidden') return null;

  const gridClass = limit <= 6 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  return (
    <section aria-labelledby={headingId} className={cn('no-print', className)}>
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary">
          Instagram
        </div>
        <h2 id={headingId} className="mb-3 text-3xl font-bold text-foreground sm:text-4xl">
          {title}
        </h2>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Montagens e eventos recentes, publicados em {INSTAGRAM_HANDLE}.
        </p>
      </div>

      {state.status === 'loading' ? (
        <div className={cn('grid gap-4 sm:gap-6', gridClass)} aria-busy="true">
          <span className="sr-only">Carregando as publicações do Instagram…</span>
          {Array.from({ length: limit }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-xl border border-border/50 bg-card">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className={cn('grid gap-4 sm:gap-6', gridClass)}>
          {state.posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex flex-col items-center justify-center gap-3 text-sm sm:flex-row sm:gap-8">
        {showPortfolioLink && (
          <Link to="/portfolio" className={linkClass}>
            Ver mais no Portfólio
          </Link>
        )}
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Seguir {INSTAGRAM_HANDLE} no Instagram
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      </div>
    </section>
  );
};

export default InstagramFeed;
