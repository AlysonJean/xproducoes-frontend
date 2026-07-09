import React, { useState, useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { createAndClickAnchor, sanitizeFilename, isSafeUrl } from '../../utils/dom';
import { normalizeString } from '../../utils/string';
import { BaseModal } from './BaseModal';
import { ImageGalleryModalProps } from '../../types/types';
import { Button } from '../ui/StandardComponents';

/**
 * SECURITY IMPROVEMENTS IMPLEMENTED (Snyk Code Rules Compliance):
 *
 * 1. XSS Prevention (CWE-79):
 *    - Sanitize all user inputs (title, description, alt) before display
 *    - Remove dangerous HTML characters and protocols
 *    - Limit string length to prevent DoS
 *
 * 2. Input Validation (CWE-20):
 *    - Validate and filter image URLs against allowlist
 *    - Check content-type headers before processing
 *    - Validate array inputs and object properties
 *
 * 3. Path Traversal Prevention (CWE-22):
 *    - Sanitize filenames to prevent directory traversal
 *    - Block dangerous file extensions
 *    - Validate URL paths for malicious patterns
 *
 * 4. Rate Limiting (CWE-400):
 *    - Implement download rate limiting to prevent abuse
 *    - Add file size limits to prevent DoS
 *
 * 5. Secure Headers (CWE-693):
 *    - Use referrerPolicy="no-referrer" on images
 *    - Add loading="lazy" for performance
 *    - Use rel="noopener noreferrer" on external links
 *
 * 6. Error Handling (CWE-209):
 *    - Don't expose internal error details to users
 *    - Log errors securely without sensitive data
 *    - Provide generic error messages to users
 */

// Utility function to sanitize user input for display
const sanitizeDisplayText = (text: string | undefined): string => {
  if (!text) return '';
  // Remove potentially dangerous characters and limit length
  return text
    .replace(/[<>'"&]/g, '') // Remove HTML characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .slice(0, 200); // Limit length to prevent DoS
};

// Rate limiting for downloads
const downloadRateLimit = {
  lastDownload: 0,
  minInterval: 1000, // 1 second between downloads
};

const isRateLimited = (): boolean => {
  const now = Date.now();
  if (now - downloadRateLimit.lastDownload < downloadRateLimit.minInterval) {
    return true;
  }
  downloadRateLimit.lastDownload = now;
  return false;
};

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

  const { addNotification } = useNotifications();

  // Input validation and sanitization
  const validatedInitialIndex = Math.max(0, Math.min(initialIndex || 0, (images?.length || 1) - 1));
  const safeImages = Array.isArray(images) ? images.filter(img =>
    img &&
    typeof img === 'object' &&
    typeof img.url === 'string' &&
    img.url.trim() !== '' &&
    isSafeImageUrl(img.url)
  ) : [];

  const [currentIndex, setCurrentIndex] = useState(validatedInitialIndex);
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
    if (!url || typeof url !== 'string') return false;

    const trimmedUrl = url.trim();
    if (trimmedUrl.length === 0 || trimmedUrl.length > 2048) return false; // Prevent DoS with very long URLs

    try {
      const allowedDomains = [
        'res.cloudinary.com',
        'images.unsplash.com',
        'cdn.jsdelivr.net',
        // Add your production domain here instead of using window.location.hostname
        'your-production-domain.com'
      ];
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
      const blockedExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];

      const base = typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000';
      const u = new URL(trimmedUrl, base);

      // Only allow http(s) and blob protocols for images
      const proto = u.protocol.toLowerCase();
      if (!(proto === 'http:' || proto === 'https:' || proto === 'blob:')) return false;

      // Block localhost and private IP ranges in production
      const hostname = (u.hostname || '').toLowerCase();
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
        return false;
      }

      // Hostname must be present and match allowed list
      const isDomainAllowed = allowedDomains.some((d) => hostname === d || hostname.endsWith('.' + d));
      if (!isDomainAllowed) return false;

      // Path extension check (case-insensitive)
      const path = (u.pathname || '').toLowerCase();

      // Block dangerous extensions
      const hasBlockedExtension = blockedExtensions.some((ext) => path.endsWith(ext));
      if (hasBlockedExtension) return false;

      // Allow only safe image extensions
      const hasAllowedExtension = allowedExtensions.some((ext) => path.endsWith(ext));
      if (!hasAllowedExtension && proto !== 'blob:') return false; // Allow blob URLs without extension check

      // Additional security: prevent path traversal
      if (path.includes('..') || path.includes('\\')) return false;

      return true;
    } catch {
      return false;
    }
  };

  const handleDownload = async () => {
    if (!currentImage) return;

    // Rate limiting check
    if (isRateLimited()) {
      addNotification({ type: 'warning', title: 'Atenção', message: 'Por favor, aguarde um momento antes de fazer outro download.' });
      return;
    }

    // Validação de segurança: só permite download de imagens de domínios/extensões confiáveis
    if (!isSafeImageUrl(currentImage.url)) {
      addNotification({ type: 'error', title: 'Segurança', message: 'Download bloqueado por segurança: domínio ou extensão de imagem não permitidos.' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(currentImage.url, {
        method: 'GET',
        mode: 'cors', // Ensure CORS compliance
        credentials: 'omit' // Don't send credentials
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = normalizeString(response.headers.get('content-type') || '');
      if (!contentType.startsWith('image/')) {
        addNotification({ type: 'error', title: 'Erro', message: 'Download bloqueado: o recurso remoto não é uma imagem.' });
        return;
      }

      // Additional security: check content length to prevent DoS
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) { // 50MB limit
        addNotification({ type: 'error', title: 'Erro', message: 'Download bloqueado: arquivo muito grande.' });
        return;
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      // Sanitize filename to prevent path traversal
      const sanitizedTitle = sanitizeDisplayText(currentImage.title);
      const suggestedName = sanitizedTitle
        ? `image-${sanitizedTitle.replace(/[^a-zA-Z0-9-_]/g, '_')}.jpg`
        : `image-${String(currentImage.id || 'img').replace(/[^a-zA-Z0-9-_]/g, '_')}.jpg`;

      // Explicit safety checks before triggering a download
      const isBlobUrl = typeof objectUrl === 'string' && objectUrl.startsWith('blob:');
      if (!isBlobUrl) {
        console.warn('Download blocked: generated object URL is not a blob URL', objectUrl);
        return;
      }

      if (!contentType.startsWith('image/')) {
        console.warn('Download blocked: server content-type is not an image', contentType);
        return;
      }

      if (isSafeUrl(objectUrl)) {
        // Prefer using a pre-existing anchor element to avoid appending nodes with external hrefs.
        const existing = document.getElementById('download-anchor') as HTMLAnchorElement | null;
        const safeName = sanitizeFilename(suggestedName);
        if (existing) {
          try {
            existing.href = objectUrl;
            if (safeName) existing.download = safeName;
            existing.target = '_blank';
            existing.rel = 'noopener noreferrer';
            existing.click();
          } finally {
            // Revoke objectUrl shortly after to free memory
            setTimeout(() => { try { window.URL.revokeObjectURL(objectUrl); } catch { /* ignore */ } }, 2000);
          }
        } else {
          // Fallback: open in new tab (user can save image). Avoid appending to DOM.
          const win = window.open(objectUrl, '_blank', 'noopener,noreferrer');
          if (!win) {
            // If popup blocked, as last resort use the safe helper which validates href
            createAndClickAnchor({ href: objectUrl, download: safeName, revokeObjectUrl: true, objectUrl });
          } else {
            setTimeout(() => { try { window.URL.revokeObjectURL(objectUrl); } catch { /* ignore */ } }, 5000);
          }
        }
      } else {
        console.warn('Download blocked: unsafe object URL', objectUrl);
      }
    } catch (err) {
      // Log minimally and keep UX silent for users - don't expose internal errors
      console.warn('Erro no download de imagem:', err instanceof Error ? err.message : 'Erro desconhecido');
      addNotification({ type: 'error', title: 'Erro', message: 'Erro ao fazer download da imagem. Tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!currentImage) return;

    // Validação de segurança: só permite compartilhar imagens de domínios/extensões confiáveis
    if (!isSafeImageUrl(currentImage.url)) {
      addNotification({ type: 'error', title: 'Segurança', message: 'Compartilhamento bloqueado por segurança: domínio ou extensão de imagem não permitidos.' });
      return;
    }

    // Sanitize data before sharing
    const safeTitle = sanitizeDisplayText(currentImage.title) || 'Imagem';
    const safeDescription = sanitizeDisplayText(currentImage.description) || 'Confira esta imagem';

    if (navigator.share) {
      try {
        await navigator.share({
          title: safeTitle,
          text: safeDescription,
          url: currentImage.url,
        });
      } catch (err) {
        // Silenciar erro - usuário cancelou ou erro do navegador
        console.warn('Erro no compartilhamento:', err instanceof Error ? err.message : 'Erro desconhecido');
      }
    } else {
      // Fallback: copy to clipboard with validation
      try {
        // Additional validation before clipboard access
        if (typeof currentImage.url === 'string' && currentImage.url.length < 2048) {
          await navigator.clipboard.writeText(currentImage.url);
          addNotification({ type: 'success', title: 'Sucesso', message: 'Link da imagem copiado para a área de transferência!' });
        } else {
          addNotification({ type: 'error', title: 'Erro', message: 'Erro: URL da imagem inválida.' });
        }
      } catch (err) {
        console.warn('Erro ao copiar para área de transferência:', err instanceof Error ? err.message : 'Erro desconhecido');
        addNotification({ type: 'error', title: 'Erro', message: 'Erro ao copiar link. Tente novamente.' });
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
              {sanitizeDisplayText(currentImage.title) || `Imagem ${currentIndex + 1} de ${safeImages.length}`}
            </h3>
            {currentImage.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {sanitizeDisplayText(currentImage.description)}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {allowDownload && (
              <Button
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
            alt={sanitizeDisplayText(currentImage.alt) || sanitizeDisplayText(currentImage.title) || `Imagem ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            onError={() => setImageError('Erro ao carregar a imagem')}
            onLoad={() => setImageError(null)}
            loading="lazy"
            referrerPolicy="no-referrer"
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
                    alt={sanitizeDisplayText(image.alt) || `Thumbnail ${index + 1}`}
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
