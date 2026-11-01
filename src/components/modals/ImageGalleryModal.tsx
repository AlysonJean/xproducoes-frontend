import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, ImageOff, Share2 } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { createAndClickAnchor, sanitizeFilename, isSafeUrl } from '../../utils/dom';
import { normalizeString } from '../../utils/string';
import { cn } from '../../utils/cn';
import { Modal } from '../ui/Modal';
import { ImageGalleryModalProps } from '../../types/types';
import { Button } from '../ui/StandardComponents';
import { logger } from '../../utils/logger';
import { isSafeImageUrl } from '../../utils/imageUrl';

// Galeria em tela cheia — aberta pelas páginas de equipamento, kit e serviço ao tocar na foto
// (via useImageGalleryModal / ModalManager).
//
// Achados (auditoria do design system):
// - isSafeImageUrl era uma const declarada DEPOIS de ser usada no corpo do componente: abrir a
//   galeria lançava "Cannot access 'isSafeImageUrl' before initialization" (a janela nunca tinha
//   sido aberta, então ninguém viu). Agora vem de utils/imageUrl.
// - A lista de domínios tinha o placeholder 'your-production-domain.com'; imagens do próprio site
//   eram recusadas.
// - Título repetido (do Modal e de novo no cabeçalho), setas e contador "1 de 1" com uma foto só,
//   área da imagem sem altura definida e ícones sem aria-hidden.

// Remove caracteres de HTML e limita o tamanho do texto exibido (título/descrição vêm de dados).
const sanitizeDisplayText = (text: string | undefined): string => {
  if (!text) return '';
  return text
    .replace(/[<>'"&]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .slice(0, 200);
};

// Intervalo mínimo entre downloads.
const downloadRateLimit = { lastDownload: 0, minInterval: 1000 };
const isRateLimited = (): boolean => {
  const now = Date.now();
  if (now - downloadRateLimit.lastDownload < downloadRateLimit.minInterval) return true;
  downloadRateLimit.lastDownload = now;
  return false;
};

const overlayButtonClass =
  'absolute top-1/2 -translate-y-1/2 z-10 h-11 w-11 rounded-full bg-black/60 p-0 text-white hover:bg-black/75 hover:text-white';

export const ImageGalleryModal: React.FC<ImageGalleryModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    images,
    initialIndex = 0,
    onImageChange,
    showThumbnails = true,
    allowDownload = true,
    allowShare = true,
    title = 'Galeria de imagens',
  } = props;

  const { addNotification } = useNotifications();

  const safeImages = Array.isArray(images)
    ? images.filter((img) => img && typeof img.url === 'string' && isSafeImageUrl(img.url))
    : [];
  const clampIndex = (index: number) => Math.max(0, Math.min(index || 0, Math.max(safeImages.length - 1, 0)));

  const [currentIndex, setCurrentIndex] = useState(() => clampIndex(initialIndex));
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentIndex(clampIndex(initialIndex));
    // clampIndex depende só do tamanho da lista
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIndex, safeImages.length]);

  useEffect(() => {
    onImageChange?.(currentIndex);
  }, [currentIndex, onImageChange]);

  const currentImage = safeImages[currentIndex];
  const hasMany = safeImages.length > 1;

  const goToPrevious = () => {
    setImageError(null);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : safeImages.length - 1));
  };
  const goToNext = () => {
    setImageError(null);
    setCurrentIndex((prev) => (prev < safeImages.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = async () => {
    if (!currentImage) return;

    if (isRateLimited()) {
      addNotification({ type: 'warning', title: 'Atenção', message: 'Aguarde um momento antes de baixar outra imagem.' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(currentImage.url, { method: 'GET', mode: 'cors', credentials: 'omit' });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const contentType = normalizeString(response.headers.get('content-type') || '');
      if (!contentType.startsWith('image/')) {
        addNotification({ type: 'error', title: 'Erro', message: 'Download bloqueado: o arquivo não é uma imagem.' });
        return;
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > 50 * 1024 * 1024) {
        addNotification({ type: 'error', title: 'Erro', message: 'Download bloqueado: arquivo muito grande.' });
        return;
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const sanitizedTitle = sanitizeDisplayText(currentImage.title);
      const suggestedName = sanitizedTitle
        ? `imagem-${sanitizedTitle.replace(/[^a-zA-Z0-9-_]/g, '_')}.jpg`
        : `imagem-${String(currentImage.id || currentIndex + 1).replace(/[^a-zA-Z0-9-_]/g, '_')}.jpg`;

      if (!objectUrl.startsWith('blob:') || !isSafeUrl(objectUrl)) {
        logger.warn('Download bloqueado: URL gerada não é blob', 'ImageGalleryModal', objectUrl);
        return;
      }
      createAndClickAnchor({ href: objectUrl, download: sanitizeFilename(suggestedName), revokeObjectUrl: true, objectUrl });
    } catch (err) {
      logger.warn('Erro no download de imagem:', 'ImageGalleryModal', err instanceof Error ? err.message : 'Erro desconhecido');
      addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível baixar a imagem. Tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!currentImage) return;
    const safeTitle = sanitizeDisplayText(currentImage.title) || 'Imagem';
    const safeDescription = sanitizeDisplayText(currentImage.description) || 'Confira esta imagem';

    if (navigator.share) {
      try {
        await navigator.share({ title: safeTitle, text: safeDescription, url: currentImage.url });
      } catch (err) {
        // Cancelado pelo usuário ou recusado pelo navegador.
        logger.warn('Erro no compartilhamento:', 'ImageGalleryModal', err instanceof Error ? err.message : 'Erro desconhecido');
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(currentImage.url);
      addNotification({ type: 'success', title: 'Link copiado', message: 'O link da imagem foi copiado.' });
    } catch (err) {
      logger.warn('Erro ao copiar link:', 'ImageGalleryModal', err instanceof Error ? err.message : 'Erro desconhecido');
      addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível copiar o link.' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!hasMany) return;
    if (e.key === 'ArrowLeft') goToPrevious();
    else if (e.key === 'ArrowRight') goToNext();
  };

  if (!currentImage) return null;

  const imageAlt =
    sanitizeDisplayText(currentImage.alt) || sanitizeDisplayText(currentImage.title) || `Imagem ${currentIndex + 1}`;

  return (
    <Modal isOpen={!!isOpen} onClose={() => onClose?.()} title={title} size="full" bodyClassName="p-4 sm:p-6">
      <div className="flex flex-col gap-4" onKeyDown={handleKeyDown}>
        {(currentImage.description || allowDownload || allowShare) && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{sanitizeDisplayText(currentImage.description)}</p>
            <div className="flex items-center gap-2">
              {allowDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  isLoading={isLoading}
                  leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
                >
                  Baixar
                </Button>
              )}
              {allowShare && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  leftIcon={<Share2 className="h-4 w-4" aria-hidden="true" />}
                >
                  Compartilhar
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="relative flex min-h-[40vh] items-center justify-center overflow-hidden rounded-lg bg-muted">
          {hasMany && (
            <Button variant="ghost" onClick={goToPrevious} aria-label="Imagem anterior" className={cn(overlayButtonClass, 'left-3')}>
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </Button>
          )}

          {imageError ? (
            <div className="flex flex-col items-center gap-3 p-8 text-center text-muted-foreground" role="alert">
              <ImageOff className="h-12 w-12" aria-hidden="true" />
              <p>{imageError}</p>
            </div>
          ) : (
            <img
              key={currentImage.url}
              src={currentImage.url}
              alt={imageAlt}
              className="max-h-[70vh] w-auto max-w-full object-contain"
              onError={() => setImageError('Não foi possível carregar a imagem.')}
              onLoad={() => setImageError(null)}
              referrerPolicy="no-referrer"
            />
          )}

          {hasMany && (
            <Button variant="ghost" onClick={goToNext} aria-label="Próxima imagem" className={cn(overlayButtonClass, 'right-3')}>
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </Button>
          )}

          {hasMany && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white" aria-live="polite">
              {currentIndex + 1} de {safeImages.length}
            </div>
          )}
        </div>

        {showThumbnails && hasMany && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {safeImages.map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={() => {
                  setImageError(null);
                  setCurrentIndex(index);
                }}
                aria-label={`Ver imagem ${index + 1}`}
                aria-pressed={index === currentIndex}
                className={cn(
                  'h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  index === currentIndex ? 'border-primary' : 'border-border hover:border-primary/50'
                )}
              >
                <img src={image.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
