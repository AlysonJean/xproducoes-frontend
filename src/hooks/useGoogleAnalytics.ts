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
      ReactGA.initialize(gaId);
      setInitialized(true);
      console.log('Google Analytics Initialized');
    }
  }, [initialized]);

  useEffect(() => {
    if (initialized) {
      // Send pageview with path
      ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
    }
  }, [initialized, location]);
};
