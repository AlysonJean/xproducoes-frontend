import { TARGET_CITIES, TARGET_SERVICES } from './localSeoConfig';
import { RESERVATION_POLICY_PATH, RESERVATION_POLICY_PUBLISHED } from '../data/reservationPolicy';
import { GUIDES } from '../data/guides';

const BASE_URL = 'https://www.xproducoeseeventos.com.br';

export const STATIC_ROUTES = [
  '/',
  '/contato',
  '/sobre',
  '/equipamentos',
  '/portfolio',
  '/faq',
  '/termos',
  '/privacidade',
  // Onda 4 da auditoria de 19/11 (F1-20): as listas públicas e a página de cookies que faltavam.
  '/kits',
  '/servicos',
  '/guias',
  '/cookies',
];

// F1-20: os guias são estáticos (src/data/guides.ts), então entram sem rede.
export const GUIDE_ROUTES = GUIDES.map((guide) => `/guias/${guide.slug}`);

export async function generateSitemap(): Promise<string> {
  // 1. Static Routes. P17 (aprovada em 02/11/2026): a política de reserva e cancelamento só entra depois de
  // publicada (chave em src/data/reservationPolicy.ts); o rascunho fica fora do sitemap.
  const routes = [...(RESERVATION_POLICY_PUBLISHED ? [...STATIC_ROUTES, RESERVATION_POLICY_PATH] : STATIC_ROUTES), ...GUIDE_ROUTES];
  const staticUrls = routes.map(route => {
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

  // 3. Kits, equipamentos e serviços ficam de fora de propósito (F1-20): buscá-los na API a cada build acordaria o
  // Render e o Neon, e com o servidor dormindo (partida a frio maior que o prazo) o sitemap sairia ora com, ora sem eles.
  // O Google os acha pelas listas /kits, /equipamentos e /servicos, que estão acima.

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
