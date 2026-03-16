import { useState } from 'react';
import { optimizeImageUrl, generateResponsiveSrcset } from '@/utils/imageOptimization';

interface OptimizedImageProps {
  publicId: string;
  alt: string;
  containerWidth?: number;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
}

/**
 * Optimized Image Component (2026)
 * 
 * Features:
 * - Automatic WebP/AVIF detection
 * - Responsive srcset generation
 * - Lazy loading with blur placeholder
 * - Progressive JPEG
 * - Zero configuration
 * 
 * Usage:
 * <OptimizedImage publicId="equipment-photo" alt="Photo" />
 */
export function OptimizedImage({
  publicId,
  alt,
  containerWidth = 800,
  width: propWidth,
  height: propHeight,
  className = '',
  loading = 'lazy',
  onLoad,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Generate placeholder image (10x8, quality 1 - 1KB)
  const placeholder = optimizeImageUrl(publicId, {
    width: 10,
    height: 8,
    quality: 1,
  });

  // Generate main image URL
  const mainSrc = optimizeImageUrl(publicId, {
    width: propWidth || containerWidth,
    height: propHeight || Math.ceil((containerWidth * 3) / 4),
  });

  // Generate responsive srcset
  const srcSet = generateResponsiveSrcset(publicId, propWidth || containerWidth);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  return (
    <picture className={`optimized-image ${isLoaded ? 'loaded' : ''}`}>
      {/* AVIF - Next-gen format (20% smaller than WebP) */}
      <source
        type="image/avif"
        srcSet={srcSet.replace(/f_auto/g, 'f_avif')}
        sizes={`(max-width: 640px) 640px, (max-width: 960px) 960px, 1200px`}
      />

      {/* WebP - All modern browsers */}
      <source
        type="image/webp"
        srcSet={srcSet.replace(/f_auto/g, 'f_webp')}
        sizes={`(max-width: 640px) 640px, (max-width: 960px) 960px, 1200px`}
      />

      {/* JPEG Fallback - Old browsers */}
      <img
        src={mainSrc || placeholder}
        srcSet={mainSrc ? srcSet : undefined}
        alt={alt}
        className={`${className} ${isLoaded ? 'visible loaded-bg' : 'loading loading-bg'}`}
        loading={loading}
        onLoad={handleLoad}
      />

      <style>{`
        .optimized-image {
          display: block;
          width: 100%;
          height: auto;
          overflow: hidden;
          border-radius: 8px;
        }

        .optimized-image img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: cover;
          transition: opacity 0.3s ease-in-out;
        }

        .optimized-image img.loading {
          filter: blur(10px);
          opacity: 0.7;
        }

        .optimized-image img.visible {
          filter: blur(0);
          opacity: 1;
        }

        .optimized-image img.loading-bg {
          background-color: #f0f0f0;
        }

        .optimized-image img.loaded-bg {
          background-color: transparent;
        }
      `}</style>
    </picture>
  );
}

/**
 * List of optimized images for equipment catalog
 */
export function OptimizedImageGallery({
  images,
  className = '',
}: {
  images: Array<{ id: string; publicId: string; alt: string }>;
  className?: string;
}) {
  return (
    <div className={`image-gallery ${className}`}>
      {images.map((img) => (
        <div key={img.id} className="gallery-item">
          <OptimizedImage
            publicId={img.publicId}
            alt={img.alt}
            containerWidth={400}
            loading="lazy"
          />
        </div>
      ))}

      <style>{`
        .image-gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
          width: 100%;
        }

        .gallery-item {
          position: relative;
          overflow: hidden;
          border-radius: 12px;
          aspect-ratio: 4/3;
          background: linear-gradient(45deg, #f0f0f0, #e0e0e0);
        }

        @media (max-width: 768px) {
          .image-gallery {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          }
        }

        @media (max-width: 480px) {
          .image-gallery {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default OptimizedImage;
