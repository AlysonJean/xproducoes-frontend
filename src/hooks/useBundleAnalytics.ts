import { useEffect, useRef } from 'react';
import { logger } from '../utils/logger';

interface BundleLoadEvent {
  chunkName: string;
  loadTime: number;
  size: number;
  cached: boolean;
}

export const useBundleAnalytics = () => {
  const loadedChunks = useRef<Map<string, BundleLoadEvent>>(new Map());
  const startTimes = useRef<Map<string, number>>(new Map());

  const trackChunkLoad = (chunkName: string, size?: number) => {
    const startTime = performance.now();
    startTimes.current.set(chunkName, startTime);

    return {
      onLoad: () => {
        const endTime = performance.now();
        const loadTime = endTime - startTime;

        const event: BundleLoadEvent = {
          chunkName,
          loadTime,
          size: size || 0,
          cached: loadTime < 50, // Heurística: < 50ms provavelmente foi cache
        };

        loadedChunks.current.set(chunkName, event);

        // Log para análise
        logger.debug(`📦 Chunk loaded: ${chunkName} - Load time: ${loadTime.toFixed(2)}ms, Size: ${size ? `${(size / 1024).toFixed(2)}KB` : 'unknown'}, Cached: ${event.cached ? 'from cache' : 'from network'}`);

        // Armazenar para dashboard
        const stored = JSON.parse(localStorage.getItem('bundleAnalytics') || '[]');
        stored.push({
          ...event,
          timestamp: new Date().toISOString(),
        });

        // Manter apenas os últimos 50 registros
        if (stored.length > 50) {
          stored.splice(0, stored.length - 50);
        }

        localStorage.setItem('bundleAnalytics', JSON.stringify(stored));
      },
    };
  };

  const getBundleMetrics = () => {
    const metrics = Array.from(loadedChunks.current.values());
    const totalSize = metrics.reduce((acc, m) => acc + m.size, 0);
    const averageLoadTime =
      metrics.length > 0 ? metrics.reduce((acc, m) => acc + m.loadTime, 0) / metrics.length : 0;
    const cacheHitRate =
      metrics.length > 0 ? (metrics.filter((m) => m.cached).length / metrics.length) * 100 : 0;

    return {
      totalChunks: metrics.length,
      totalSize,
      averageLoadTime,
      cacheHitRate,
      chunks: metrics,
    };
  };

  useEffect(() => {
    // Monitor dynamic imports via performance observer
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as PerformanceResourceTiming;
        if (resourceEntry.initiatorType === 'script' && entry.name.includes('chunk')) {
          const chunkName =
            entry.name
              .split('/')
              .pop()
              ?.replace(/\.(js|ts|tsx?)-.*\.js$/, '') || 'unknown';
          const loadTime = entry.duration;

          const event: BundleLoadEvent = {
            chunkName,
            loadTime,
            size: resourceEntry.transferSize || 0,
            cached: resourceEntry.transferSize === 0, // Sem transferência = cache
          };

          loadedChunks.current.set(chunkName, event);

          logger.debug(`📦 Chunk loaded: ${chunkName} - Load time: ${loadTime.toFixed(2)}ms, Size: ${event.size ? `${(event.size / 1024).toFixed(2)}KB` : 'unknown'}, Cached: ${event.cached ? 'from cache' : 'from network'}`);
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });

    return () => {
      observer.disconnect();
    };
  }, []);

  return {
    trackChunkLoad,
    getBundleMetrics,
    loadedChunks: loadedChunks.current,
  };
};
