import { Expand } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';
import { useImageGalleryModal } from '../modals/ModalContext';
import { cn } from '../../utils/cn';
import { isSafeImageUrl } from '../../utils/imageUrl';

interface ZoomableProductPhotoProps {
  src: string;
  alt: string;
  /** Fotos extras (ex.: Kit.images), mostradas na galeria depois da principal. */
  extraImages?: string[];
  className?: string;
}

// Foto principal das páginas de equipamento, kit e serviço: tocar abre a galeria em tela cheia
// (ImageGalleryModal, que estava montada no ModalManager mas nunca era aberta).
export function ZoomableProductPhoto({ src, alt, extraImages = [], className }: ZoomableProductPhotoProps) {
  const { openImageGalleryModal } = useImageGalleryModal();
  const urls = [src, ...extraImages.filter((url) => url && url !== src)];
  const photoClass = cn('w-full h-auto rounded-xl object-cover shadow-lg border border-border', className);

  // Foto que a galeria recusaria (host desconhecido, sem extensão de imagem): mostra só a imagem,
  // sem um "Ampliar" que não abriria nada.
  if (!isSafeImageUrl(src)) {
    return <OptimizedImage src={src} alt={alt} priority={true} className={photoClass} />;
  }

  return (
    <button
      type="button"
      onClick={() =>
        openImageGalleryModal({
          title: alt,
          images: urls.map((url, index) => ({ url, alt: urls.length > 1 ? `${alt} — foto ${index + 1}` : alt })),
          allowDownload: false,
          allowShare: false,
        })
      }
      aria-label={`Ampliar foto: ${alt}`}
      className="group relative block w-full cursor-zoom-in rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <OptimizedImage src={src} alt={alt} priority={true} className={photoClass} />
      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-sm font-medium text-white">
        <Expand className="h-4 w-4" aria-hidden="true" />
        Ampliar
      </span>
    </button>
  );
}
