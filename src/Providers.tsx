import React from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { initSentry } from './utils/sentry'
import './styles/themes/theme-variables.css'
import './index.css'
import './styles/headingReveal'
import 'react-big-calendar/lib/css/react-big-calendar.css'

// Initialize Sentry
const sentry = initSentry()
if (typeof window !== 'undefined') {
  (window as any).__SENTRY__ = sentry
}
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
