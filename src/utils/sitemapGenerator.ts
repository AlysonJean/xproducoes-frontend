import { TARGET_CITIES, TARGET_SERVICES } from './localSeoConfig';

const BASE_URL = 'https://www.xproducoeseeventos.com.br';

export const STATIC_ROUTES = [
  '/',
  '/contato',
  '/sobre',
  '/equipamentos',
  '/portfolio',
  '/faq',
  '/termos',
  '/privacidade'
];

export async function generateSitemap(): Promise<string> {
  // 1. Static Routes
  const staticUrls = STATIC_ROUTES.map(route => {
    return `
  <url>
    <loc>${BASE_URL}${route}</loc>
    <changefreq>weekly</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`;
  }).join('');

  // 2. Local SEO Landing Pages (Service + City)
  const localSeoUrls = TARGET_SERVICES.flatMap(service => 
    TARGET_CITIES.map(city => {
      const url = `${BASE_URL}/${service.slug}-${city.slug}`;
      return `
  <url>
    <loc>${url}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
    })
  ).join('');

  // 3. Equipment Pages (Placeholder - In a real scenario, fetch this from API/DB)
  // For now, we will rely on Google discovering these via the /equipamentos listing
  // or we could implement a fetch here if we had direct DB access.

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${localSeoUrls}
</urlset>`;

  return sitemap;
}

export function generateRobotsTxt(): string {
  // Lista derivada das rotas privadas reais em src/App.tsx (não apenas /admin — os
  // painéis de cliente e colaborador também ficam atrás de login e não devem ser
  // indexados). Mantenha isso em sincronia se novas áreas privadas forem adicionadas.
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /painel
Disallow: /cliente
Disallow: /colaborador
Disallow: /api/

Sitemap: ${BASE_URL}/sitemap.xml
`;
}
