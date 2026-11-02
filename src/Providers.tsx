import React from 'react'
import { Analytics, type BeforeSend } from '@vercel/analytics/react'
import { initSentry } from './utils/sentry'
import { stripSensitiveParams } from './utils/sensitiveParams'
import { useWebVitals } from './hooks/useWebVitals'
import './styles/themes/theme-variables.css'
import './index.css'
// Initialize Sentry
const sentry = typeof window !== 'undefined' ? initSentry() : null
// Achado (revisão antes do deploy): window.__SENTRY__ é o objeto global do próprio SDK do Sentry
// (onde ele guarda o client e os escopos). Gravar ali o objeto do app trocava esse global logo
// depois do init: o client sumia e nenhum erro chegava ao Sentry. O app usa um global próprio,
// lido por utils/logger.ts.
if (typeof window !== 'undefined' && sentry) {
  (window as unknown as { __XP_SENTRY__?: typeof sentry }).__XP_SENTRY__ = sentry
}
const SentryErrorBoundary = (sentry && sentry.ErrorBoundary) || (({ children }: { children: React.ReactNode }) => children)

// Achado (revisão antes do deploy): o Vercel Analytics manda a URL inteira da barra em cada page
// view, e os links dos e-mails levam token, e-mail e código nela. Mesmo filtro do Sentry. Fica fora
// do componente porque o <Analytics /> registra o beforeSend de novo sempre que a função muda.
const analyticsBeforeSend: BeforeSend = (event) => ({ ...event, url: stripSensitiveParams(event.url) })

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
      <Analytics beforeSend={analyticsBeforeSend} />
    </WebVitalsMonitor>
  )
}
