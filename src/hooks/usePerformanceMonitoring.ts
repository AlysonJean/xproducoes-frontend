import { useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

interface NavigationTiming {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  memoryUsage?: number;
}

export const usePerformanceMonitoring = () => {
  const measurePerformance = useCallback((): Promise<PerformanceMetrics> => {
    return new Promise((resolve) => {
      if ('performance' in window && 'getEntriesByType' in performance) {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');

        const fcp = paint.find((entry) => entry.name === 'first-contentful-paint')?.startTime || 0;

        // Web Vitals measurement
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const metrics: PerformanceMetrics = {
              fcp,
              lcp: entry.name === 'largest-contentful-paint' ? entry.startTime : 0,
              fid:
                entry.name === 'first-input'
                  ? (entry as unknown as { processingStart: number }).processingStart -
                    entry.startTime
                  : 0,
              cls:
                entry.name === 'layout-shift' ? (entry as unknown as { value: number }).value : 0,
              ttfb: navigation.responseStart - navigation.fetchStart,
            };
            resolve(metrics);
          }
        });

        // Observe Web Vitals
        observer.observe({
          entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'],
        });

        // Fallback timeout
        setTimeout(() => {
          resolve({
            fcp,
            lcp: 0,
            fid: 0,
            cls: 0,
            ttfb: navigation.responseStart - navigation.fetchStart,
          });
        }, 3000);
      } else {
        resolve({
          fcp: 0,
          lcp: 0,
          fid: 0,
          cls: 0,
          ttfb: 0,
        });
      }
    });
  }, []);

  const getNavigationTiming = useCallback((): NavigationTiming => {
    if ('performance' in window && 'timing' in performance) {
      const timing = performance.timing;

      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
        memoryUsage:
          (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
            ?.usedJSHeapSize || 0,
      };
    }

    return {
      loadTime: 0,
      domContentLoaded: 0,
      firstPaint: 0,
      memoryUsage: 0,
    };
  }, []);

  const sendPerformanceData = useCallback(
    async (_metrics: PerformanceMetrics & NavigationTiming) => {
      try {
        // Em um cenário real, enviaria para um serviço de analytics
        // TODO: Integrar sistema de log/monitoramento
        // Exemplo: logPerformanceMetrics({
        //   ...metrics,
        //   timestamp: new Date().toISOString(),
        //   userAgent: navigator.userAgent,
        //   connection: (navigator as unknown as { connection?: { effectiveType: string } }).connection?.effectiveType || 'unknown',
        // });
        // Exemplo de envio para API de analytics
        // await fetch('/api/analytics/performance', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(metrics)
        // });
      } catch {
        // TODO: Integrar sistema de notificação/log para erros de envio de dados de performance
      }
    },
    []
  );

  useEffect(() => {
    const collectMetrics = async () => {
      try {
        const performanceMetrics = await measurePerformance();
        const navigationTiming = getNavigationTiming();

        const allMetrics = { ...performanceMetrics, ...navigationTiming };
        await sendPerformanceData(allMetrics);

        // Store in localStorage for dashboard
        localStorage.setItem('lastPerformanceMetrics', JSON.stringify(allMetrics));
      } catch {
        // TODO: Integrar sistema de notificação/log para erros de coleta de métricas
      }
    };

    // Collect metrics after page load
    if (document.readyState === 'complete') {
      setTimeout(collectMetrics, 1000);
    } else {
      window.addEventListener('load', () => setTimeout(collectMetrics, 1000));
    }
  }, [measurePerformance, getNavigationTiming, sendPerformanceData]);

  return {
    measurePerformance,
    getNavigationTiming,
    sendPerformanceData,
  };
};
