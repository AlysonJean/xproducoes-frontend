/**
 * Route Prefetching Utilities (2026 pattern)
 * Handles pre-loading of lazy-loaded chunks for better performance
 */

/**
 * Prefetch a specific chunk
 * Usage in components:
 * <Link to="/admin" onMouseEnter={() => prefetchChunk('admin')}>
 *   Admin Dashboard
 * </Link>
 */
export function prefetchChunk(chunkName: string) {
  if (typeof document === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'script';
  link.href = `/${chunkName}-chunk.js`;
  document.head.appendChild(link);
}

/**
 * Initialize route prefetching on network idle (2026 pattern)
 * Preload likely next routes when browser is idle
 */
export function initializePrefetching() {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    requestIdleCallback(
      () => {
        // Prefetch feature chunks
        prefetchChunk('feature-admin');
        prefetchChunk('feature-collaborator');
        prefetchChunk('feature-booking');
        prefetchChunk('feature-shop');
      },
      { timeout: 10000 }
    );
  }
}
