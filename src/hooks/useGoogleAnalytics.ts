import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

export const useGoogleAnalytics = () => {
  const location = useLocation();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Only initialize if we haven't already and the ID is present
    const gaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
    
    if (gaId && !initialized) {
      // Defer initialization to avoid blocking main thread on initial load
      const timeoutId = setTimeout(() => {
        ReactGA.initialize(gaId);
        setInitialized(true);
      }, 3000); // 3 second delay

      return () => clearTimeout(timeoutId);
    }
  }, [initialized]);

  useEffect(() => {
    if (initialized) {
      // Send pageview with path
      ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
    }
  }, [initialized, location]);
};
