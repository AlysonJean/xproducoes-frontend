import { useEffect, useCallback } from 'react';
import * as Sentry from '@sentry/react';

/**
 * Web Vitals + Core Web Vitals Monitoring Hook (2026 standard)
 * 
 * Tracks Google's Web Vitals metrics for production performance monitoring:
 * - LCP (Largest Contentful Paint): Page load performance
 * - FID (First Input Delay): Responsiveness (deprecated in favor of INP)
 * - INP (Interaction to Next Paint): Responsiveness (new metric)
 * - CLS (Cumulative Layout Shift): Visual stability
 * - TTFB (Time to First Byte): Network performance
 * 
 * All metrics automatically sent to Sentry for analysis
 */

interface WebVitalMetric {
  name: string;
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id?: string;
  entries?: PerformanceEntry[];
}

const THRESHOLD_LCP = 2500; // Good: < 2.5s
const THRESHOLD_INP = 200; // Good: < 200ms
const THRESHOLD_CLS = 0.1; // Good: < 0.1
const THRESHOLD_TTFB = 800; // Good: < 800ms

export function useWebVitals() {
  const reportMetric = useCallback((metric: WebVitalMetric) => {
    // Send to Sentry
    if (window.__SENTRY__) {
      Sentry.captureMessage(`Web Vital: ${metric.name}`, {
        level: 'info',
        contexts: {
          trace: {
            op: 'web-vital',
            description: metric.name,
            data: {
              value: metric.value,
              rating: metric.rating,
              threshold: getThresholdForMetric(metric.name),
            },
          },
        },
      });
    }

    // Log for debugging
    console.debug(`📊 ${metric.name}: ${metric.value.toFixed(2)}ms`, {
      rating: metric.rating,
      threshold: getThresholdForMetric(metric.name),
    });
  }, []);

  useEffect(() => {
    // Check if Web Vitals API is available
    if (!('web-vital' in window && typeof PerformanceObserver !== 'undefined')) {
      console.warn('Web Vitals API not available');
      return;
    }

    // Track LCP (Largest Contentful Paint)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceLongTaskTiming;

        const metric: WebVitalMetric = {
          name: 'LCP',
          value: lastEntry.renderTime || lastEntry.loadTime,
          rating: getRating('LCP', lastEntry.renderTime || lastEntry.loadTime),
        };

        reportMetric(metric);
      });

      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'], buffered: true });
    } catch (e) {
      // LCP not supported
    }

    // Track INP (Interaction to Next Paint) - replaces FID
    try {
      const inpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;

        const metric: WebVitalMetric = {
          name: 'INP',
          value: lastEntry.processingDuration || 0,
          rating: getRating('INP', lastEntry.processingDuration || 0),
        };

        reportMetric(metric);
      });

      inpObserver.observe({ entryTypes: ['event'], buffered: true });
    } catch (e) {
      // INP not supported
    }

    // Track CLS (Cumulative Layout Shift)
    try {
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            const metric: WebVitalMetric = {
              name: 'CLS',
              value: entry.value,
              rating: getRating('CLS', entry.value),
            };

            reportMetric(metric);
          }
        });
      });

      clsObserver.observe({ entryTypes: ['layout-shift'], buffered: true });
    } catch (e) {
      // CLS not supported
    }

    // Track TTFB (Time to First Byte) - from Navigation Timing API
    try {
      if (performance.timing && performance.timing.responseStart) {
        const ttfb = performance.timing.responseStart - performance.timing.navigationStart;
        const metric: WebVitalMetric = {
          name: 'TTFB',
          value: ttfb,
          rating: getRating('TTFB', ttfb),
        };

        reportMetric(metric);
      }
    } catch (e) {
      // Navigation Timing not available
    }

    // Cleanup
    return () => {
      try {
        PerformanceObserver.prototype.disconnect?.call(null);
      } catch (e) {
        // Ignore
      }
    };
  }, [reportMetric]);

  return { reportMetric };
}

/**
 * Determine if metric rating is good, needs improvement, or poor
 */
function getRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  switch (metricName) {
    case 'LCP':
      return value < THRESHOLD_LCP ? 'good' : value < THRESHOLD_LCP * 1.5 ? 'needs-improvement' : 'poor';
    case 'INP':
      return value < THRESHOLD_INP ? 'good' : value < THRESHOLD_INP * 1.5 ? 'needs-improvement' : 'poor';
    case 'CLS':
      return value < THRESHOLD_CLS ? 'good' : value < THRESHOLD_CLS * 1.5 ? 'needs-improvement' : 'poor';
    case 'TTFB':
      return value < THRESHOLD_TTFB ? 'good' : value < THRESHOLD_TTFB * 1.5 ? 'needs-improvement' : 'poor';
    default:
      return 'good';
  }
}

/**
 * Get threshold for a given metric
 */
function getThresholdForMetric(metricName: string): number {
  const thresholds: Record<string, number> = {
    LCP: THRESHOLD_LCP,
    INP: THRESHOLD_INP,
    CLS: THRESHOLD_CLS,
    TTFB: THRESHOLD_TTFB,
  };

  return thresholds[metricName] || 0;
}
