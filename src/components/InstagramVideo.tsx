import { useState } from 'react';
import { Play } from 'lucide-react';
import { Modal } from './ui/Modal';
import { OptimizedImage } from './ui/OptimizedImage';
import { buildInstagramEmbedUrl, safeInstagramPermalink } from '../utils/instagram';
import { cn } from '../utils/cn';

interface InstagramVideoProps {
  /** Endereço da publicação no Instagram (permalink). Só vira player se for mesmo do Instagram. */
  permalink: string | null | undefined;
  /** Capa do vídeo (cópia no Cloudinary). */
  imageUrl: string;
  /** Descrição curta do vídeo, para o leitor de tela e o título do player. */
  label: string;
  /** Classes do botão (por padrão ele cobre a caixa onde está, que precisa ser `relative`). */
  className?: string;
  /** Largura pedida ao Cloudinary para a capa. */
  imageWidth?: number;
}

/**
 * Pedido do dono de 09/11/2026 (Instagram): vídeos e Reels tocam no player oficial do Instagram, porque a música
 * licenciada só toca lá dentro e o site nunca baixa o arquivo do vídeo. Até o clique só aparece a capa (cópia no
 * Cloudinary): nenhum pedido vai ao Instagram antes de o visitante escolher assistir (Política de Cookies). O player
 * abre numa janela e some quando ela fecha.
 */
export const InstagramVideo = ({ permalink, imageUrl, label, className, imageWidth = 600 }: InstagramVideoProps) => {
  const [open, setOpen] = useState(false);
  const embedUrl = buildInstagramEmbedUrl(permalink);
  const postUrl = safeInstagramPermalink(permalink);

  // Endereço que não é do Instagram: fica só a capa, sem botão de assistir.
  if (!embedUrl) {
    return <OptimizedImage src={imageUrl} alt={label} fill width={imageWidth} className={className} />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Assistir ao vídeo: ${label}`}
        title="Assistir ao vídeo (abre o player do Instagram)"
        className={cn(
          'group/video absolute inset-0 h-full w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
          className
        )}
      >
        <OptimizedImage
          src={imageUrl}
          alt=""
          fill
          width={imageWidth}
          className="transition-transform duration-500 group-hover/video:scale-105"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/20" aria-hidden="true">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover/video:scale-110">
            <Play className="ml-1 h-7 w-7 fill-current" />
          </span>
        </span>
        <span
          className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white"
          aria-hidden="true"
        >
          Vídeo
        </span>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Vídeo do Instagram" size="md">
        <div className="mx-auto w-full max-w-[420px] space-y-3">
          <iframe
            src={embedUrl}
            title={`Vídeo do Instagram: ${label}`}
            className="h-[min(75vh,720px)] w-full rounded-lg border-0 bg-white"
            allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <p className="text-center text-xs text-muted-foreground">
            O vídeo é exibido pelo Instagram (Meta).{' '}
            {postUrl && (
              <a
                href={postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:underline underline-offset-4"
              >
                Abrir no Instagram
              </a>
            )}
          </p>
        </div>
      </Modal>
    </>
  );
};

export default InstagramVideo;
