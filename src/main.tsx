
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { initSentry } from './utils/sentry';
import './styles/themes/theme-variables.css';
import './index.css';
import './styles/headingReveal';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Initialize Sentry for error monitoring
const sentry = initSentry();
// Use ErrorBoundary from sentry init (it will be a no-op when Sentry is disabled)
const SentryErrorBoundary = (sentry && (sentry as any).ErrorBoundary) || (({ children }: any) => children);

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
    <BrowserRouter future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}>
      <SentryErrorBoundary>
        <App />
      </SentryErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);

// Export sentry for use in other parts of the app
export { sentry };
