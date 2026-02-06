/**
 * Utility for optimizing Cloudinary image URLs
 * Adds automatic format (f_auto) and quality (q_auto) transformations
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: 'auto' | 'low' | 'eco' | 'good' | 'best' | number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  crop?: 'scale' | 'fit' | 'fill' | 'limit' | 'pad' | 'thumb';
  gravity?: 'auto' | 'center' | 'face' | 'north' | 'south' | 'east' | 'west';
}

/**
 * Generates an optimized Cloudinary URL
 * @param url The original Cloudinary URL
 * @param options Optimization options (width, height, quality, etc.)
 * @returns The optimized URL string
 */
export function getOptimizedImageUrl(
  url: string,
  options: ImageOptimizationOptions = {}
): string {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'limit',
    gravity
  } = options;

  // Build transformation string
  const transformations: string[] = [];

  // 1. Format & Quality (Base optimizations)
  transformations.push(`f_${format}`);
  transformations.push(`q_${quality}`);

  // 2. Dimensions & Crop
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (crop) transformations.push(`c_${crop}`);
  if (gravity) transformations.push(`g_${gravity}`);

  const transformationString = transformations.join(',');

  // Insert transformation into URL
  // Matches: /upload/v123456/... or /upload/...
  const uploadRegex = /\/upload\/(?:v\d+\/)?/;
  const match = url.match(uploadRegex);

  if (match) {
    return url.replace(
      uploadRegex,
      `/upload/${transformationString}/`
    );
  }

  return url;
}

/**
 * Generates key breakpoints for responsive images
 */
export const DEVICE_SIZES = {
  mobile: 640,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
  wide: 1536
};

/**
 * Generates a srcSet string for responsive images
 */
export function generateSrcSet(url: string, sizes: number[] = [640, 768, 1024, 1280]): string {
  if (!url || !url.includes('cloudinary.com')) return '';

  return sizes
    .map(size => {
      const optimizedUrl = getOptimizedImageUrl(url, { width: size });
      return `${optimizedUrl} ${size}w`;
    })
    .join(', ');
}
