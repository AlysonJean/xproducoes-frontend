// Validação das URLs de imagem exibidas em tela cheia (ImageGalleryModal) — e usada antes de
// oferecer "Ampliar" (ZoomableProductPhoto), para o botão nunca abrir uma galeria vazia.
const ALLOWED_IMAGE_HOSTS = ['res.cloudinary.com', 'images.unsplash.com', 'cdn.jsdelivr.net'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif'];

// Só exibe/baixa/compartilha imagens de hosts conhecidos (ou do próprio site) com extensão de imagem.
export const isSafeImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmedUrl = url.trim();
  if (trimmedUrl.length === 0 || trimmedUrl.length > 2048) return false;

  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const u = new URL(trimmedUrl, origin);
    const proto = u.protocol.toLowerCase();
    if (proto === 'blob:') return true;
    if (proto !== 'http:' && proto !== 'https:') return false;

    const hostname = u.hostname.toLowerCase();
    const sameOrigin = u.origin === origin;
    const allowedHost = ALLOWED_IMAGE_HOSTS.some((d) => hostname === d || hostname.endsWith('.' + d));
    if (!sameOrigin && !allowedHost) return false;

    const path = u.pathname.toLowerCase();
    if (path.includes('..') || path.includes('\\')) return false;
    return ALLOWED_EXTENSIONS.some((ext) => path.endsWith(ext));
  } catch {
    return false;
  }
};
