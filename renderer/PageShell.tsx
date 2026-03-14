import React from 'react'
import { PageContextProvider } from './usePageContext'
import type { PageContext } from 'vike/types'
import { Providers } from '../src/Providers'
import { ErrorBoundary } from '../src/components/ErrorBoundary'

export function PageShell({ pageContext, children }: { pageContext: PageContext; children: React.ReactNode }) {
  return (
    <React.StrictMode>
      <PageContextProvider pageContext={pageContext}>
        <Providers>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </Providers>
      </PageContextProvider>
    </React.StrictMode>
  )
}
