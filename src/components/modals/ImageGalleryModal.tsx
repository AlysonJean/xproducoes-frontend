import React, { useState, useEffect } from 'react';
import { createAndClickAnchor } from '../../utils/dom';
import { normalizeString } from '../../utils/string';
import { BaseModal } from './BaseModal';
import { ImageGalleryModalProps } from '../../types/types';
import { Button } from '../ui/StandardComponents';

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
    title = 'Galeria de Imagens',
  } = props;
  const safeImages = images || [];
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (onImageChange) {
      onImageChange(currentIndex);
    }
  }, [currentIndex, onImageChange]);

  const currentImage = safeImages[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : safeImages.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < safeImages.length - 1 ? prev + 1 : 0));
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  const isSafeImageUrl = (url: string) => {
    try {
      const allowedDomains = [
        'res.cloudinary.com',
        'images.unsplash.com',
        'cdn.jsdelivr.net',
        window.location.hostname,
      ];
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      const u = new URL(url);
      const isDomainAllowed = allowedDomains.some((d) => u.hostname.endsWith(d));
  const isExtAllowed = allowedExtensions.some((ext) => normalizeString(u.pathname).endsWith(ext));
      return isDomainAllowed && isExtAllowed;
    } catch {
      return false;
    }
  };

  const handleDownload = async () => {
    if (!currentImage) return;

    // Validação de segurança: só permite download de imagens de domínios/extensões confiáveis
    if (!isSafeImageUrl(currentImage.url)) {
      alert('Download bloqueado por segurança: domínio ou extensão de imagem não permitidos.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(currentImage.url);
      if (!response.ok) throw new Error('Falha ao obter a imagem');
  const contentType = normalizeString(response.headers.get('content-type') || '');
  if (!contentType.startsWith('image/')) {
        alert('Download bloqueado: o recurso remoto não é uma imagem.');
        return;
      }
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  // use helper to create and click transient anchor; the helper will remove the node
  createAndClickAnchor({ href: objectUrl, download: `image-${currentImage.id}.jpg`, revokeObjectUrl: true, objectUrl });
    } catch (err) {
      // Log minimally and keep UX silent for users
      console.warn('Erro no download de imagem:', err instanceof Error ? err.message : err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!currentImage) return;

    // Validação de segurança: só permite compartilhar imagens de domínios/extensões confiáveis
    if (!isSafeImageUrl(currentImage.url)) {
      alert('Compartilhamento bloqueado por segurança: domínio ou extensão de imagem não permitidos.');
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: currentImage.title || 'Imagem',
          text: currentImage.description || 'Confira esta imagem',
          url: currentImage.url,
        });
      } catch {
        // Silenciar erro
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(currentImage.url);
        alert('Link da imagem copiado para a área de transferência!');
      } catch {
        // Silenciar erro
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      goToPrevious();
    } else if (e.key === 'ArrowRight') {
      goToNext();
    }
  };

  if (!currentImage) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} size="full">
      <div className="h-full flex flex-col" onKeyDown={handleKeyDown} tabIndex={0}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-medium text-foreground">
              {currentImage.title || `Imagem ${currentIndex + 1} de ${safeImages.length}`}
            </h3>
            {currentImage.description && (
              <p className="text-sm text-muted-foreground mt-1">{currentImage.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {allowDownload && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                isLoading={isLoading}
                title="Baixar imagem"
                className="p-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </Button>
            )}
            {allowShare && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleShare}
                title="Compartilhar"
                className="p-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                  />
                </svg>
              </Button>
            )}
          </div>
        </div>

        {/* Main Image */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          {/* Navigation Buttons */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goToPrevious}
            disabled={safeImages.length <= 1}
            title="Imagem anterior"
            aria-label="Imagem anterior"
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goToNext}
            disabled={safeImages.length <= 1}
            title="Próxima imagem"
            aria-label="Próxima imagem"
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>

          {/* Image */}
          <img
            src={currentImage.url}
            alt={currentImage.alt || currentImage.title || `Imagem ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            onError={() => setImageError('Erro ao carregar a imagem')}
            onLoad={() => setImageError(null)}
          />

          {/* Error Message */}
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center">
                <svg
                  className="w-16 h-16 text-muted-foreground mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <p className="text-muted-foreground">{imageError}</p>
              </div>
            </div>
          )}

          {/* Image Counter */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} de {safeImages.length}
          </div>
        </div>

        {/* Thumbnails */}
        {showThumbnails && safeImages.length > 1 && (
          <div className="p-4 bg-muted border-t">
            <div className="flex space-x-2 overflow-x-auto">
              {safeImages.map((image, index) => (
                <Button
                  key={image.id}
                  type="button"
                  variant={index === currentIndex ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => goToImage(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                    index === currentIndex
                      ? 'border-blue-500'
                      : 'border hover:border'
                  }`}
                  title={`Selecionar imagem ${index + 1}`}
                  aria-label={`Selecionar imagem ${index + 1}`}
                >
                  <img
                    src={image.url}
                    alt={image.alt || `Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
