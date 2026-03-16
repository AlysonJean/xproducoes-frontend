/**
 * Utilitários para manipulação de URLs de imagens
 */
import { logger } from './logger';

/**
 * Normaliza URLs do Cloudinary que usam cloud "demo" para paths locais
 * URLs inválidas do Cloudinary são convertidas para caminhos locais
 * 
 * @example
 * normalizeImageUrl('https://res.cloudinary.com/demo/image/upload/kit-pa.png')
 * // retorna: '/uploads/kit-pa.png'
 * 
 * @example
 * normalizeImageUrl('https://res.cloudinary.com/mycloud/image/upload/v123/photo.jpg')
 * // retorna: 'https://res.cloudinary.com/mycloud/image/upload/v123/photo.jpg'
 */
export function normalizeImageUrl(url: string | undefined | null): string {
  if (!url) {
    return '/uploads/default-equipment.png';
  }

  // Se for URL do Cloudinary com cloud "demo" (inválido)
  if (url.includes('res.cloudinary.com/demo/')) {
    try {
      // Extrair o nome do arquivo da URL
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Pega a última parte do path (nome do arquivo)
      const filename = pathname.split('/').pop() || 'default-equipment.png';
      
      console.warn(`[imageUtils] Cloudinary demo URL detected, using local fallback: ${filename}`);
      return `/uploads/${filename}`;
    } catch (error) {
      console.error('[imageUtils] Failed to parse Cloudinary URL:', url, error);
      return '/uploads/default-equipment.png';
    }
  }

  // Se for caminho relativo, garantir que comece com /
  if (!url.startsWith('http') && !url.startsWith('/')) {
    return `/${url}`;
  }

  return url;
}

/**
 * Otimiza URLs do Cloudinary para entregar WebP/AVIF automaticamente e ajustar qualidade
 * Adiciona parâmetros 'f_auto,q_auto' na URL
 */
export function optimizeCloudinaryUrl(url: string, width?: number): string {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  
  // Evitar duplicação ou aplicar em URLs de demo
  if (url.includes('/f_auto,q_auto') || url.includes('/demo/')) return url;

  // Inserir transformação após '/upload/'
  const [base, file] = url.split('/upload/');
  if (!file) return url;

  let transformation = 'f_auto,q_auto';
  if (width) transformation += `,w_${width}`;

  return `${base}/upload/${transformation}/${file}`;
}

/**
 * Gera URL de placeholder com texto personalizado
 */
export function getPlaceholderUrl(text: string, width = 600, height = 400): string {
  const encodedText = encodeURIComponent(text.replace(/\s/g, '+'));
  return `https://placehold.co/${width}x${height}/1a202c/ffffff?text=${encodedText}`;
}

/**
 * Verifica se uma URL de imagem é válida (não é placeholder)
 */
export function isValidImageUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  
  // Placeholder URLs não são consideradas válidas
  if (url.includes('placehold.co')) return false;
  if (url.includes('placeholder')) return false;
  
  // Cloudinary demo URLs não são válidas
  if (url.includes('res.cloudinary.com/demo/')) return false;
  
  return true;
}
