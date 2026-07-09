import { describe, it, expect } from 'vitest';
import { generateSitemap, generateRobotsTxt, STATIC_ROUTES } from '../sitemapGenerator';
import { TARGET_CITIES, TARGET_SERVICES } from '../localSeoConfig';

const CANONICAL_DOMAIN = 'https://www.xproducoeseeventos.com.br';

// Achado (Fase 3): o gerador de sitemap/robots.txt existia mas nunca era chamado (sitemap
// nunca era servido de verdade), tinha um erro de digitação no domínio
// ("xproduceoseeventos"), e a lista de robots.txt do Disallow (mantida à mão, separada
// deste gerador) não cobria as áreas privadas reais (/cliente, /colaborador).
describe('sitemapGenerator - domínio canônico correto e cobertura real de rotas', () => {
  it('generateSitemap usa o domínio canônico correto (sem erro de digitação)', async () => {
    const xml = await generateSitemap();

    expect(xml).toContain(CANONICAL_DOMAIN);
    expect(xml).not.toContain('xproduceoseeventos');
    expect(xml).not.toContain('xproducoes.com.br');
  });

  it('generateSitemap inclui todas as rotas estáticas e todas as combinações serviço×cidade', async () => {
    const xml = await generateSitemap();

    for (const route of STATIC_ROUTES) {
      expect(xml).toContain(`<loc>${CANONICAL_DOMAIN}${route}</loc>`);
    }

    for (const service of TARGET_SERVICES) {
      for (const city of TARGET_CITIES) {
        expect(xml).toContain(`<loc>${CANONICAL_DOMAIN}/${service.slug}-${city.slug}</loc>`);
      }
    }
  });

  it('generateRobotsTxt aponta para o sitemap no domínio canônico', async () => {
    const robots = await generateRobotsTxt();

    expect(robots).toContain(`Sitemap: ${CANONICAL_DOMAIN}/sitemap.xml`);
  });

  it('generateRobotsTxt desautoriza todas as áreas privadas reais (admin, painel, cliente, colaborador)', async () => {
    const robots = await generateRobotsTxt();

    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain('Disallow: /painel');
    expect(robots).toContain('Disallow: /cliente');
    expect(robots).toContain('Disallow: /colaborador');
  });
});
