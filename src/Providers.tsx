/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Analytics } from '@vercel/analytics/react'
import { initSentry } from './utils/sentry'
import { useWebVitals } from './hooks/useWebVitals'
import './styles/themes/theme-variables.css'
import './index.css'
// Initialize Sentry
const sentry = typeof window !== 'undefined' ? initSentry() : null
if (typeof window !== 'undefined' && sentry) {
  (window as any).__SENTRY__ = sentry
  // Load heading reveal only on client side
  import('./styles/headingReveal');
}
const SentryErrorBoundary = (sentry && (sentry as any).ErrorBoundary) || (({ children }: any) => children)

// ✅ Web Vitals monitoring wrapper component
const WebVitalsMonitor: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useWebVitals()
  return <>{children}</>
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

const GoogleWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (googleClientId && googleClientId !== 'your-google-client-id') {
    return <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider>
  }
  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WebVitalsMonitor>
      <GoogleWrapper>
        <HelmetProvider>
          <SentryErrorBoundary>
            {children}
          </SentryErrorBoundary>
        </HelmetProvider>
      </GoogleWrapper>
      <Analytics />
    </WebVitalsMonitor>
  )
}
