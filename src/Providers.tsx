import React from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { initSentry } from './utils/sentry'
import './styles/themes/theme-variables.css'
import './index.css'
// Initialize Sentry
const sentry = initSentry()
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__SENTRY__ = sentry
  // Load heading reveal only on client side
  import('./styles/headingReveal');
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SentryErrorBoundary = (sentry && (sentry as any).ErrorBoundary) || (({ children }: any) => children)

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

const GoogleWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (googleClientId && googleClientId !== 'your-google-client-id') {
    return <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider>
  }
  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleWrapper>
      <HelmetProvider>
        <SentryErrorBoundary>
          {children}
        </SentryErrorBoundary>
      </HelmetProvider>
    </GoogleWrapper>
  )
}
