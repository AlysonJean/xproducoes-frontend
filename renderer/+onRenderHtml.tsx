import React from 'react'
import { Writable } from 'node:stream'
import { renderToStream } from 'react-streaming/server'
import { escapeInject, dangerouslySkipEscape } from 'vike/server'
import type { OnRenderHtmlAsync } from 'vike/types'
import type { HelmetServerState } from 'react-helmet-async'
import { PageShell } from './PageShell'
import { StaticRouter } from 'react-router'

import type { PageContextServer } from 'vike/types'

// Junta os chunks de um Node.js Writable-pipe (retornado por react-streaming) numa única
// string. Ver comentário abaixo, no uso, sobre por que bufferizamos em vez de fazer streaming
// de verdade até o cliente.
function pipeToString(pipe: (writable: Writable) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const writable = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        callback()
      }
    })
    writable.on('finish', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    writable.on('error', reject)
    pipe(writable)
  })
}

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
  // Keep SSR resilient in production: avoid throwing when Page is temporarily unavailable.
  if (!Page) {
    const fallbackHtml = escapeInject`<!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>X-Produções</title>
        </head>
        <body>
          <div id="root"></div>
        </body>
      </html>`
    return fallbackHtml
  }

  // Achado (ver histórico do commit anterior, revertido): ReactDOMServer.renderToString() é uma
  // API síncrona legada que não suporta React.lazy()/Suspense de forma confiável — App.tsx usa
  // lazy() em ~30 rotas, e qualquer import() ainda não resolvido no momento síncrono do render
  // lançava exceção durante o SSR, causando "Uncaught Error: Minified React error #419" ao
  // hidratar no cliente. renderToStream() (react-streaming, a mesma lib que vike-react usa
  // internamente) usa por baixo dos panos renderToPipeableStream() do próprio react-dom, que
  // aguarda de verdade a resolução de Suspense boundaries antes de finalizar. Uma tentativa
  // anterior tentou também fazer streaming de verdade até o cliente (embutindo o stream direto
  // no template do Vike), mas isso quebrou o handler serverless da Vercel (api/ssr.js), que
  // espera um body 100% string (ver commit de revert). Por isso aqui bufferizamos o resultado
  // de volta para uma string com pipeToString — perdemos o ganho de performance do streaming de
  // rede, mas resolvemos a causa raiz do #419 sem tocar em nenhuma camada de transporte
  // (server.ts e api/ssr.js continuam exatamente como sempre funcionaram).
  // Preenchido por <HelmetProvider context={helmetContext}> DEPOIS que a árvore termina de
  // renderizar (por isso só é lido após o `await pipeToString` abaixo, nunca antes).
  const helmetContext: { helmet?: HelmetServerState } = {}

  const streamResult = await renderToStream(
    <PageShell pageContext={pageContext} helmetContext={helmetContext}>
      <StaticRouter location={pageContext.urlOriginal}>
        <Page {...pageProps} />
      </StaticRouter>
    </PageShell>,
    { disable: true }
  )
  if (!streamResult.pipe) {
    throw new Error('react-streaming: esperava um Node.js pipe stream (disable: true), mas recebi um Web ReadableStream.')
  }
  const pageHtml = await pipeToString(streamResult.pipe)
  const { helmet } = helmetContext

  const { documentProps } = pageContext.data || pageContext.exports
  const title = (documentProps && documentProps.title) || 'X-Produções - Aluguel de Equipamentos'
  const desc = (documentProps && documentProps.description) || 'Soluções completas em audiovisuais para seu evento em BH'
  const image = (documentProps && documentProps.image) || 'https://www.xproducoeseeventos.com.br/xproducoes-logo.png'
  const url = pageContext.urlOriginal
    ? `https://www.xproducoeseeventos.com.br${pageContext.urlOriginal}`
    : 'https://www.xproducoeseeventos.com.br'

  // Quando a página renderiza <SEO>/<Helmet> (ver src/components/SEO.tsx, usado em ~17
  // páginas), helmet.title já vem com a tag <title> completa e específica da página — usamos
  // o conjunto inteiro do Helmet (title+meta+link+script, que já inclui OG/Twitter/JSON-LD) no
  // lugar do bloco genérico abaixo, para não duplicar/conflitar tags no <head>. Páginas sem
  // <SEO> continuam recebendo o título/descrição genéricos de sempre.
  const helmetTitleHtml = helmet?.title.toString() ?? ''
  const usedPageSeo = helmetTitleHtml.includes('<title')

  const seoHeadTags = usedPageSeo
    ? dangerouslySkipEscape(
        [helmetTitleHtml, helmet!.meta.toString(), helmet!.link.toString(), helmet!.script.toString()].join('\n')
      )
    : escapeInject`
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
      `

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
        <!-- Achado (Lighthouse contra produção real): a fonte web era carregada em dois
             lugares — este <link> (só Inter) e um @import em src/index.css (Inter + Outfit).
             @import é descoberto tarde (só depois do parser CSS baixar/processar a folha de
             estilo principal) e o double-fetch de Inter por dois mecanismos diferentes
             contribuía para o maior culpado de CLS medido no site inteiro (0.35 de um total de
             ~0.35 — praticamente 100% do layout shift, causado por "Web font loaded" reflowando
             o layout). Consolidado num único <link> com as duas famílias, descoberto cedo no
             parsing do HTML (junto com os preconnect já existentes para o mesmo domínio) — o
             @import correspondente foi removido de index.css. -->
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        ${seoHeadTags}
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
