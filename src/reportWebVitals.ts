import { onCLS, onINP, onLCP, onFCP, onTTFB, Metric } from 'web-vitals';
import ReactGA from 'react-ga4';

/**
 * Sends Web Vitals metrics to Google Analytics 4
 * @see https://github.com/GoogleChrome/web-vitals#send-the-results-to-google-analytics
 */
const reportWebVitals = () => {
  const sendToAnalytics = ({ name, delta, id }: Metric) => {
    // Avoid sending if GA is not initialized (dev mode with no ID)
    if (!window.gtag) return;

    ReactGA.event({
      category: 'Web Vitals',
      action: name,
      // Google Analytics metrics must be integers, so we round.
      // For CLS, the value is first multiplied by 1000 for greater precision
      // (e.g. 0.03 becomes 30).
      value: Math.round(name === 'CLS' ? delta * 1000 : delta), 
      label: id, // id unique to current page load
      nonInteraction: true,
    });
    
    // Optional: Log to console in development
    if (import.meta.env.DEV) {
      console.log(`[Web Vitals] ${name}:`, delta);
    }
  };

  onCLS(sendToAnalytics);
  onINP(sendToAnalytics); // FID is deprecated, INP is the new standard
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
};

export default reportWebVitals;
