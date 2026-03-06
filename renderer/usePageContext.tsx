import React, { useContext } from 'react'
import type { PageContext } from 'vike/types'

const Context = React.createContext<PageContext | undefined>(undefined)

export function PageContextProvider({ pageContext, children }: { pageContext: PageContext; children: React.ReactNode }) {
  return <Context.Provider value={pageContext}>{children}</Context.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePageContext() {
  const pageContext = useContext(Context)
  if (!pageContext) throw new Error('<PageContextProvider> is needed for being able to use usePageContext()')
  return pageContext
}
