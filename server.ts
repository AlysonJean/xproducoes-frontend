import express from 'express'
import { renderPage } from 'vike/server'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const isProduction = process.env.NODE_ENV === 'production'
const root = __dirname



// Local SEO Configuration (Inlined for Server Reliability)
const BASE_URL = 'https://www.xproduceoseeventos.com.br';
const TARGET_CITIES = [
  { slug: 'belo-horizonte', name: 'Belo Horizonte' },
  { slug: 'nova-lima', name: 'Nova Lima' },
  { slug: 'contagem', name: 'Contagem' },
  { slug: 'betim', name: 'Betim' },
  { slug: 'lagoa-santa', name: 'Lagoa Santa' }
];

const TARGET_SERVICES = [
  { slug: 'aluguel-som' },
  { slug: 'aluguel-iluminacao' },
  { slug: 'aluguel-painel-led' },
  { slug: 'aluguel-palco-estrutura' }
];

const STATIC_ROUTES = [
  '/',
  '/contato',
  '/sobre',
  '/equipamentos',
  '/portfolio',
  '/faq',
  '/termos',
  '/privacidade'
];

async function startServer() {
  const app = express()

  // --------------------------------------------------------
  // SEO Routes (Sitemap & Robots) - Defined BEFORE Middleware
  // --------------------------------------------------------
  app.get('/sitemap.xml', async (req, res) => {
    try {
      // 1. Static Routes
      const staticUrls = STATIC_ROUTES.map(route => `
  <url>
    <loc>${BASE_URL}${route}</loc>
    <changefreq>weekly</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('');

      // 2. Local SEO Landing Pages
      const localSeoUrls = TARGET_SERVICES.flatMap(service => 
        TARGET_CITIES.map(city => `
  <url>
    <loc>${BASE_URL}/${service.slug}-${city.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`)
      ).join('');

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${localSeoUrls}
</urlset>`;

      res.header('Content-Type', 'application/xml');
      res.status(200).send(sitemap);
    } catch (e) {
      console.error(e);
      res.status(500).end();
    }
  });

  app.get('/robots.txt', (req, res) => {
    const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /cliente/painel/
Disallow: /colaborador/main/

Sitemap: ${BASE_URL}/sitemap.xml`;
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
      urlOriginal: req.originalUrl
    }
    const pageContext = await renderPage(pageContextInit)
    const { httpResponse } = pageContext
    if (!httpResponse) {
      return next()
    } else {
      const { body, statusCode, earlyHints } = httpResponse
      if (res.writeEarlyHints) res.writeEarlyHints({ link: earlyHints.map((e) => e.earlyHintLink) })
      helpers(httpResponse, res)
      res.status(statusCode).send(body)
    }
  })

  // Helper function to set headers
  const helpers = (httpResponse: any, res: any) => {
    const { headers } = httpResponse
    headers.forEach(([name, value]: [string, string]) => res.setHeader(name, value))
  }

  const port = process.env.PORT || 3000
  app.listen(port)
  console.log(`Server running at http://localhost:${port}`)
}

startServer()
