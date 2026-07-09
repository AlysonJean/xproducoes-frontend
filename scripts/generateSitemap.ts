/**
 * Gera public/sitemap.xml e public/robots.txt a partir de src/utils/sitemapGenerator.ts,
 * a única fonte de verdade para rotas estáticas + páginas de SEO local (serviço × cidade).
 * Antes desta correção, esse gerador existia mas nunca era chamado — nenhum sitemap real
 * era servido, e robots.txt (estático, mantido manualmente) apontava para um
 * sitemap.xml que não existia, além de ter uma lista de áreas privadas desatualizada.
 *
 * Roda automaticamente antes do build (ver "prebuild" em package.json), então o sitemap
 * nunca fica defasado quando localSeoConfig.ts ganha novas cidades/serviços.
 */
import { writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateSitemap, generateRobotsTxt } from '../src/utils/sitemapGenerator';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public');

async function main() {
  const [sitemap, robots] = await Promise.all([generateSitemap(), generateRobotsTxt()]);

  await writeFile(resolve(publicDir, 'sitemap.xml'), sitemap, 'utf8');
  await writeFile(resolve(publicDir, 'robots.txt'), robots, 'utf8');

  console.log('sitemap.xml e robots.txt gerados em public/.');
}

main().catch((error) => {
  console.error('Falha ao gerar sitemap.xml/robots.txt:', error);
  process.exitCode = 1;
});
