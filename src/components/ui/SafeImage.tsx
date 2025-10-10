import React, { useState, ImgHTMLAttributes } from 'react';

interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
  alt: string;
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
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError) {
      console.warn(`Failed to load image: ${imageSrc}, using fallback`);
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
      className={className}
      onError={handleError}
      loading="lazy"
    />
  );
};

export default SafeImage;
