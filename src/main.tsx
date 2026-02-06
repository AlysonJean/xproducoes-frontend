
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { initSentry } from './utils/sentry';
import './styles/themes/theme-variables.css';
import './index.css';
import './styles/headingReveal';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Initialize Sentry for error monitoring
const sentry = initSentry();
// Expose sentry globally to avoid circular dependency issues
if (typeof window !== 'undefined') {
  (window as any).__SENTRY__ = sentry;
}
// Use ErrorBoundary from sentry init (it will be a no-op when Sentry is disabled)
const SentryErrorBoundary = (sentry && (sentry as any).ErrorBoundary) || (({ children }: any) => children);

// Google OAuth client ID - só renderiza o Provider se estiver configurado
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Wrapper condicional para Google OAuth
const GoogleWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (googleClientId && googleClientId !== 'your-google-client-id') {
    return <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider>;
  }
  return <>{children}</>;
};

const container = document.getElementById('root');
// @ts-ignore
let root = window.__root;
if (!root) {
  root = ReactDOM.createRoot(container!);
  // @ts-ignore
  window.__root = root;
}
root.render(
  <React.StrictMode>
    <GoogleWrapper>
      <HelmetProvider>
        <BrowserRouter future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}>
          <SentryErrorBoundary>
            <App />
          </SentryErrorBoundary>
        </BrowserRouter>
      </HelmetProvider>
    </GoogleWrapper>
  </React.StrictMode>
);

// Export sentry for use in other parts of the app
export { sentry };

// Report Web Vitals to Google Analytics
import reportWebVitals from './reportWebVitals';
reportWebVitals();
