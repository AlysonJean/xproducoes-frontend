import React, { useState, ImgHTMLAttributes, useMemo } from 'react';
import { optimizeCloudinaryUrl } from '../../utils/imageUtils';

interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
  alt: string;
  optimize?: boolean;
}

/**
 * Componente de imagem com fallback automático para URLs quebradas
 * Útil para imagens de CDN, Cloudinary, etc que podem estar indisponíveis
 */
export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  fallbackSrc = '/uploads/default-equipment.png',
  alt,
  className = '',
  onError,
  optimize = true,
  ...props
}) => {
  // Otimizar URL inicial se for Cloudinary
  const optimizedSrc = useMemo(() => 
    optimize ? optimizeCloudinaryUrl(src) : src
  , [src, optimize]);

  const [imageSrc, setImageSrc] = useState(optimizedSrc);
  const [hasError, setHasError] = useState(false);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError) {
      // console.warn(`Failed to load image: ${imageSrc}, using fallback`);
      setHasError(true);
      setImageSrc(fallbackSrc);
    }
  
    // Chamar onError personalizado se fornecido
    if (onError) {
      onError(e);
    }
  };

  return (
    <img
      {...props}
      src={imageSrc}
      alt={alt}
      className={`${className} ${hasError ? 'opacity-80' : ''}`}
      onError={handleError}
      loading="lazy"
      // Previne CLS se width/height forem passados
      width={props.width}
      height={props.height}
    />
  );
};

export default SafeImage;
