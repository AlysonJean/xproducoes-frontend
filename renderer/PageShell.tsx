import React from 'react'
import { PageContextProvider } from './usePageContext'
import type { PageContext } from 'vike/types'
import { Providers } from '../src/Providers'
import { ErrorBoundary } from '../src/components/ui/ErrorBoundary'

export function PageShell({ pageContext, children }: { pageContext: PageContext; children: React.ReactNode }) {
  const isServer = typeof window === 'undefined'

  return (
    <React.StrictMode>
      <PageContextProvider pageContext={pageContext}>
        {isServer ? (
          <ErrorBoundary>{children}</ErrorBoundary>
        ) : (
          <Providers>
            <ErrorBoundary>{children}</ErrorBoundary>
          </Providers>
        )}
      </PageContextProvider>
    </React.StrictMode>
  )
}
