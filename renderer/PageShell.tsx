import React from 'react'
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async'
import { PageContextProvider } from './usePageContext'
import type { PageContext } from 'vike/types'
import { Providers } from '../src/Providers'
import { ErrorBoundary } from '../src/components/ui/ErrorBoundary'

export function PageShell({
  pageContext,
  children,
  helmetContext,
}: {
  pageContext: PageContext
  children: React.ReactNode
  // Achado: <HelmetProvider> nunca recebia um `context` — react-helmet-async só expõe as tags
  // coletadas durante o SSR (title/meta/link/script) através desse objeto, preenchido DEPOIS
  // que a árvore termina de renderizar. Sem ele, onRenderHtml.tsx não tinha como ler as tags
  // de <SEO>/<Helmet> de volta — toda página sempre recebia o <title>/<meta> genérico do
  // fallback estático, mesmo as ~17 páginas que já usavam <SEO> com conteúdo específico.
  helmetContext?: { helmet?: HelmetServerState }
}) {
  const isServer = typeof window === 'undefined'

  // Achado: react-helmet-async (usado por <SEO>/<Helmet> em ~17 páginas, incluindo Home,
  // Sobre, Contato, FAQ) exige um <HelmetProvider> ancestral em QUALQUER ambiente, inclusive
  // — na verdade, especialmente — no servidor (é a própria razão da lib existir: coletar as
  // tags de <head> durante o SSR). Antes, HelmetProvider só existia dentro de <Providers>,
  // que este componente pulava inteiramente no servidor (isServer). Isso fazia qualquer
  // página que renderizasse <SEO>/<Helmet> sem estar atrás de um gate de "loading" (a
  // maioria das páginas estáticas) lançar exceção de verdade durante a renderização no
  // servidor — e como essas páginas são carregadas via React.lazy()/Suspense em App.tsx,
  // essa exceção server-side é exatamente o que produz
  // "Uncaught Error: Minified React error #419" ("The server could not finish this
  // Suspense boundary... during server rendering") ao hidratar no cliente. Corrigido
  // colocando HelmetProvider aqui fora, presente nos dois ambientes; os outros provedores
  // client-only de <Providers> (Web Vitals, Analytics etc., que não fazem sentido/não são
  // seguros no servidor) continuam como estavam.
  return (
    <React.StrictMode>
      <PageContextProvider pageContext={pageContext}>
        <HelmetProvider context={helmetContext}>
          {isServer ? (
            <ErrorBoundary>{children}</ErrorBoundary>
          ) : (
            <Providers>
              <ErrorBoundary>{children}</ErrorBoundary>
            </Providers>
          )}
        </HelmetProvider>
      </PageContextProvider>
    </React.StrictMode>
  )
}
