import React from 'react'
import { PageContextProvider } from './usePageContext'
import type { PageContext } from 'vike/types'
import { Providers } from '../src/Providers'

export function PageShell({ pageContext, children }: { pageContext: PageContext; children: React.ReactNode }) {
  return (
    <React.StrictMode>
      <PageContextProvider pageContext={pageContext}>
        <Providers>
          {children}
        </Providers>
      </PageContextProvider>
    </React.StrictMode>
  )
}
