import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { escapeInject, dangerouslySkipEscape } from 'vike/server'
import type { OnRenderHtmlAsync } from 'vike/types'
import { PageShell } from './PageShell'
import { StaticRouter } from 'react-router-dom'

import type { PageContextServer } from 'vike/types'

type PageContext = PageContextServer & {
  Page: React.ElementType
  pageProps: Record<string, unknown>
  exports: {
    documentProps?: {
      title?: string
      description?: string
      image?: string
    }
  }
  data?: {
    documentProps?: {
      title?: string
      description?: string
      image?: string
    }
  }
}

export const onRenderHtml: OnRenderHtmlAsync = async (pageContextServer: PageContextServer): ReturnType<OnRenderHtmlAsync> => {
  const pageContext = pageContextServer as unknown as PageContext
  const { Page, pageProps } = pageContext
  // This onRenderHtml() hook only supports SSR, see https://vike.dev/render-modes for how to modify onRenderHtml() to support SPA
  if (!Page) throw new Error('My render() hook expects pageContext.Page to be defined')
  
  // Alternatively, providing a fallback for SPA only pages
  // const pageHtml = Page ? ReactDOMServer.renderToString(
  //   <PageShell pageContext={pageContext}>
  //     <Page {...pageProps} />
  //   </PageShell>
  // ) : ''

  const pageHtml = ReactDOMServer.renderToString(
    <PageShell pageContext={pageContext}>
      <StaticRouter location={pageContext.urlOriginal}>
        <Page {...pageProps} />
      </StaticRouter>
    </PageShell>
  )

  const { documentProps } = pageContext.data || pageContext.exports
  const title = (documentProps && documentProps.title) || 'X-Produções - Aluguel de Equipamentos'
  const desc = (documentProps && documentProps.description) || 'Soluções completas em audiovisuais para seu evento em BH'
  const image = (documentProps && documentProps.image) || '/xproducoes-logo.svg'
  const url = pageContext.urlOriginal ? `https://xproducoes.com.br${pageContext.urlOriginal}` : 'https://xproducoes.com.br'

  const documentHtml = escapeInject`<!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <link rel="icon" href="/favicon.svg" />
        
        <!-- Resource Hints -->
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />

        <!-- Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="${desc}" />
        <title>${title}</title>

        <!-- Dynamic Open Graph -->
        <meta property="og:type" content="website" />
        <meta property="og:url" content="${url}" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${desc}" />
        <meta property="og:image" content="${image}" />
        <meta property="og:site_name" content="X Produções" />

        <!-- Twitter Card -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="${url}" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${desc}" />
        <meta name="twitter:image" content="${image}" />
      </head>
      <body>
        <div id="root">${dangerouslySkipEscape(pageHtml)}</div>
      </body>
    </html>`

  return {
    documentHtml,
    pageContext: {
      // We can add some `pageContext` here, which is useful if we want to do page redirection https://vike.dev/page-redirection
    }
  }
}
