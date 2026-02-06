import React from 'react';
import { getOptimizedImageUrl, generateSrcSet } from '../../utils/imageOptimizer';
import { cn } from '../../utils/cn'; // Assuming you have a cn utility, otherwise use standard class concat

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean; // If true, sets loading="eager" and fetchpriority="high" (for LCP images)
  className?: string;
  sizes?: string; // Standard HTML sizes attribute
  fill?: boolean; // If true, make image fill container (absolute positioned)
  aspectRatio?: string; // CSS aspect-ratio
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

import './OptimizedImage.css';

interface CustomCSS extends React.CSSProperties {
  '--img-aspect-ratio'?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  fill = false,
  aspectRatio,
  objectFit = 'cover',
  style,
  ...props
}) => {
  // Don't optimize non-cloudinary images or generic placeholders unless needed
  const isCloudinary = src && src.includes('cloudinary.com');
  
  const imageSrc = isCloudinary 
    ? getOptimizedImageUrl(src, { width: width || 800 }) // Default fallback width
    : src;

  const srcSet = isCloudinary
    ? generateSrcSet(src)
    : undefined;

  // Map objectFit to proper Tailwind classes
  const objectFitClass = {
    contain: 'object-contain',
    cover: 'object-cover',
    fill: 'object-fill',
    none: 'object-none',
    'scale-down': 'object-scale-down',
  }[objectFit];

  // Use CSS variable for aspect ratio to comply with "no inline styles" rule
  // We still pass 'style' if it contains other things from props, but aspect ratio is handled via class
  const variableStyle: CustomCSS = aspectRatio ? { '--img-aspect-ratio': aspectRatio } : {};
  const combinedStyle = style ? { ...variableStyle, ...style } : variableStyle;

  return (
    <img
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      srcSet={srcSet}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={cn(
        'transition-opacity duration-300',
        objectFitClass,
        fill && 'absolute inset-0 h-full w-full',
        aspectRatio && 'optimized-image-with-ratio',
        className
      )}
      style={Object.keys(combinedStyle).length > 0 ? combinedStyle as React.CSSProperties : undefined}
      {...props}
    />
  );
};
