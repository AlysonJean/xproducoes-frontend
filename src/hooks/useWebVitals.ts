import { useEffect } from 'react';
import { captureMessage, addBreadcrumb } from '@sentry/react';
import { logger } from '../utils/logger';

/**
 * Web Vitals Monitoring Hook (2026 standard - Production Ready)
 * 
 * Tracks Google's Core Web Vitals for production performance:
 * - LCP (Largest Contentful Paint): < 2.5s
 * - INP (Interaction to Next Paint): < 200ms
 * - CLS (Cumulative Layout Shift): < 0.1
 * - TTFB (Time to First Byte): < 800ms
 * 
 * Auto-reports to Sentry with performance context
 */

interface WebVitalMetric {
  name: string;
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
}

type LayoutShiftLike = PerformanceEntry & {
  hadRecentInput?: boolean;
  value?: number;
};

type InteractionTimingLike = PerformanceEntry & {
  duration?: number;
  startTime: number;
};

const THRESHOLDS = {
  'LCP': { good: 2500, poor: 4000 },
  'INP': { good: 200, poor: 500 },
  'CLS': { good: 0.1, poor: 0.25 },
  'TTFB': { good: 800, poor: 1800 },
};

function getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[metric as keyof typeof THRESHOLDS];
  if (!threshold) return 'needs-improvement';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

function reportToSentry(metric: WebVitalMetric) {
  try {
    // Send to Sentry
    captureMessage(`Web Vital: ${metric.name} = ${metric.value}ms`, 'info');

    // Add breadcrumb for context
    addBreadcrumb({
      category: 'web-vital',
      message: `${metric.name}: ${metric.value}ms (${metric.rating})`,
      level: metric.rating === 'good' ? 'info' : metric.rating === 'needs-improvement' ? 'warning' : 'error',
      data: {
        value: metric.value,
        rating: metric.rating,
        threshold: THRESHOLDS[metric.name as keyof typeof THRESHOLDS]?.good || 0,
      },
    });
  } catch (error) {
    logger.error('Error reporting Web Vital to Sentry:', 'useWebVitals', error);
  }
}

/**
 * Hook to monitor Web Vitals
 */
export function useWebVitals() {
  useEffect(() => {
    // Check if performance observer is available
    if (typeof PerformanceObserver === 'undefined') {
      console.debug('PerformanceObserver not available');
      return;
    }

    const observers: PerformanceObserver[] = [];

    const supportsEntryType = (entryType: string): boolean => {
      try {
        const supported = (PerformanceObserver as typeof PerformanceObserver & { supportedEntryTypes?: string[] }).supportedEntryTypes;
        return Array.isArray(supported) && supported.includes(entryType);
      } catch {
        return false;
      }
    };

    const observeEntryType = (observer: PerformanceObserver, entryType: string, durationThreshold?: number) => {
      const baseConfig: Record<string, unknown> = { type: entryType };
      if (typeof durationThreshold === 'number') {
        baseConfig.durationThreshold = durationThreshold;
      }

      try {
        observer.observe({ ...baseConfig, buffered: true } as PerformanceObserverInit);
      } catch {
        // Safari/older browsers can reject `buffered` when using specific observe signatures.
        observer.observe(baseConfig as PerformanceObserverInit);
      }
    };

    try {
      // Monitor Largest Contentful Paint (LCP)
      if (supportsEntryType('largest-contentful-paint')) {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          if (entries.length > 0) {
            const lastEntry = entries[entries.length - 1];
            const metric: WebVitalMetric = {
              name: 'LCP',
              value: Math.round(lastEntry.startTime),
              rating: getRating('LCP', lastEntry.startTime),
            };
            reportToSentry(metric);
          }
        });

        observeEntryType(lcpObserver, 'largest-contentful-paint');
        observers.push(lcpObserver);
      }

      // Monitor Cumulative Layout Shift (CLS)
      let clsValue = 0;
      if (supportsEntryType('layout-shift')) {
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            const layoutEntry = entry as LayoutShiftLike;
            if (!layoutEntry.hadRecentInput) {
              clsValue += layoutEntry.value ?? 0;
            }
          }
          const metric: WebVitalMetric = {
            name: 'CLS',
            value: Math.round(clsValue * 1000) / 1000,
            rating: getRating('CLS', clsValue),
          };
          reportToSentry(metric);
        });

        observeEntryType(clsObserver, 'layout-shift');
        observers.push(clsObserver);
      }

      // Monitor Time to First Byte (TTFB)
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationTiming?.responseStart) {
        const ttfb = Math.round(navigationTiming.responseStart - navigationTiming.fetchStart);
        const metric: WebVitalMetric = {
          name: 'TTFB',
          value: ttfb,
          rating: getRating('TTFB', ttfb),
        };
        reportToSentry(metric);
      }

      // Monitor Interaction to Next Paint (INP)
      const inpEntryType = supportsEntryType('interaction')
        ? 'interaction'
        : supportsEntryType('event')
          ? 'event'
          : null;

      if (inpEntryType) {
        const inpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          if (entries.length > 0) {
            const lastEntry = entries[entries.length - 1] as InteractionTimingLike;
            const interactionDuration = lastEntry.duration ?? 0;
            const metric: WebVitalMetric = {
              name: 'INP',
              value: Math.round(interactionDuration),
              rating: getRating('INP', interactionDuration),
            };
            reportToSentry(metric);
          }
        });

        observeEntryType(inpObserver, inpEntryType, 40);
        observers.push(inpObserver);
      } else {
        console.debug('INP monitoring not available');
      }
    } catch (error) {
      logger.error('Error setting up Web Vitals monitoring:', 'useWebVitals', error);
    }

    return () => {
      for (const observer of observers) {
        observer.disconnect();
      }
    };
  }, []);
}

export default useWebVitals;
