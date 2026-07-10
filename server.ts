import express from 'express'
import { renderPage } from 'vike/server'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { generateSitemap, generateRobotsTxt } from './src/utils/sitemapGenerator'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const isProduction = process.env.NODE_ENV === 'production'
const root = __dirname

async function startServer() {
  const app = express()

  // --------------------------------------------------------
  // SEO Routes (Sitemap & Robots) - Defined BEFORE Middleware
  // Reaproveita src/utils/sitemapGenerator.ts (mesma fonte usada por
  // scripts/generateSitemap.ts no build) — antes, este arquivo mantinha sua própria
  // cópia inline duplicada, com uma lista de robots.txt Disallow desatualizada
  // (não cobria /cliente nem /colaborador).
  // --------------------------------------------------------
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const sitemap = await generateSitemap();
      res.header('Content-Type', 'application/xml');
      res.status(200).send(sitemap);
    } catch (e) {
      console.error(e);
      res.status(500).end();
    }
  });

  app.get('/robots.txt', async (req, res) => {
    const robots = await generateRobotsTxt();
    res.header('Content-Type', 'text/plain');
    res.status(200).send(robots);
  });
  // --------------------------------------------------------

  if (isProduction) {
    app.use(express.static(`${root}/dist/client`))
  } else {
    // New Vike standard for development middleware
    const { createDevMiddleware } = await import('vike/server')
    const { devMiddleware } = await createDevMiddleware({ root })
    app.use(devMiddleware)
  }

  app.get(/(.*)/, async (req, res, next) => {
    const pageContextInit = {
      urlOriginal: req.originalUrl,
      // Necessário para react-streaming decidir se faz streaming (browsers) ou renderização
      // bloqueante completa (bots/crawlers, para garantir HTML completo no primeiro request) —
      // ver renderer/+onRenderHtml.tsx. Convenção atual do Vike (a antiga `headers` é
      // deprecated): https://vike.dev/headers
      headersOriginal: req.headers
    }
    const pageContext = await renderPage(pageContextInit)
    const { httpResponse } = pageContext
    if (!httpResponse) {
      return next()
    } else {
      const { statusCode, earlyHints } = httpResponse
      if (res.writeEarlyHints) res.writeEarlyHints({ link: earlyHints.map((e) => e.earlyHintLink) })
      helpers(httpResponse, res)
      res.status(statusCode)
      // Streaming de verdade via Node.js Writable Stream (renderToStream, ver
      // +onRenderHtml.tsx) — cai para .send(body) só se o hook não tiver retornado stream
      // algum (ex.: fallbackHtml estático quando pageContext.Page está ausente).
      httpResponse.pipe(res)
    }
  })

  // Helper function to set headers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const helpers = (httpResponse: any, res: any) => {
    const { headers } = httpResponse
    headers.forEach(([name, value]: [string, string]) => res.setHeader(name, value))
  }

  const preferredPort = Number(process.env.PORT) || 3000

  const listenWithFallback = (startPort: number) => {
    const server = app.listen(startPort, () => {
      console.log(`Server running at http://localhost:${startPort}`)
    })

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE' && !process.env.PORT) {
        const nextPort = startPort + 1
        console.warn(`Port ${startPort} is in use. Retrying on ${nextPort}...`)
        server.close(() => listenWithFallback(nextPort))
        return
      }

      throw error
    })
  }

  listenWithFallback(preferredPort)
}

startServer()
