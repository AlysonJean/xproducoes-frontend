import React from 'react'
import { Analytics } from '@vercel/analytics/react'
import { initSentry } from './utils/sentry'
import { useWebVitals } from './hooks/useWebVitals'
import './styles/themes/theme-variables.css'
import './index.css'
// Initialize Sentry
const sentry = typeof window !== 'undefined' ? initSentry() : null
if (typeof window !== 'undefined' && sentry) {
  (window as unknown as { __SENTRY__?: typeof sentry }).__SENTRY__ = sentry
  // Load heading reveal only on client side
  import('./styles/headingReveal');
}
const SentryErrorBoundary = (sentry && sentry.ErrorBoundary) || (({ children }: { children: React.ReactNode }) => children)

// ✅ Web Vitals monitoring wrapper component
const WebVitalsMonitor: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useWebVitals()
  return <>{children}</>
}

// Achado (Lighthouse contra produção real): GoogleOAuthProvider vivia aqui, envolvendo o app
// inteiro — injetava o script do Google Identity Services (~96 KB, 83% nunca usado na home,
// que não tem nenhum botão de login) em toda página, não só nas que precisam. Movido para
// dentro de GoogleAuthButton.tsx (único consumidor real de useGoogleLogin no app), que agora
// monta seu próprio provider só quando o botão realmente é renderizado.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WebVitalsMonitor>
      <SentryErrorBoundary>
        {children}
      </SentryErrorBoundary>
      <Analytics />
    </WebVitalsMonitor>
  )
}
