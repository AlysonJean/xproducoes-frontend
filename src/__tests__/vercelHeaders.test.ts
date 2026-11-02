import { describe, it, expect } from 'vitest';
import vercelConfig from '../../vercel.json';

// Achado (revisão antes do deploy): a regra geral "/(.*)" do vercel.json manda
// "s-maxage=3600, stale-while-revalidate=86400" para todo caminho, inclusive /api/v1/*, que a Vercel
// repassa ao backend no Render — respostas autenticadas saíam marcadas como cacheáveis em cache
// compartilhado (a borda da Vercel aparentemente não as guardava por causa do cookie CSRF, mas isso
// não é garantia). /api/(.*) agora tem regra própria, declarada depois da regra geral para valer
// sobre ela: "private" (nenhum cache compartilhado) + "no-cache" (o navegador revalida antes de
// reaproveitar). Não é "no-store" de propósito: requisição de JS com no-store tira a página do
// back/forward cache do Chrome, que api/ssr.js preserva.
//
// Como a Vercel combina as regras: aplica, na ordem do arquivo, todas cujo "source" casa com o
// caminho pedido (o original, antes dos rewrites); para a mesma chave, vale a última que casou.
function effectiveHeaders(path: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rule of vercelConfig.headers) {
    // Este teste só interpreta regras com "source" literal + "(.*)" e sem has/missing; outra forma
    // falha aqui em vez de ser avaliada errado.
    expect(Object.keys(rule).sort()).toEqual(['headers', 'source']);
    const parts = rule.source.split('(.*)');
    expect(parts.join('')).toMatch(/^[\w./-]+$/);
    if (!new RegExp(`^${parts.map((p) => p.replace(/\./g, '\\.')).join('(.*)')}$`).test(path)) continue;
    for (const { key, value } of rule.headers) result[key.toLowerCase()] = value;
  }
  return result;
}

describe('vercel.json — Cache-Control efetivo por caminho', () => {
  it('respostas da API nunca ficam em cache compartilhado', () => {
    for (const path of ['/api/v1/auth/me', '/api/v1/bookings/b1', '/api/v1/csrf-token']) {
      const cacheControl = effectiveHeaders(path)['cache-control'];
      expect(cacheControl).toContain('private');
      expect(cacheControl).toContain('no-cache');
      expect(cacheControl).not.toContain('s-maxage');
    }
    // A regra da API só troca o Cache-Control; os cabeçalhos de segurança da regra geral continuam.
    expect(effectiveHeaders('/api/v1/auth/me')['x-frame-options']).toBe('DENY');
  });

  it('páginas mantêm o cache do HTML do SSR e o service worker continua sem cache', () => {
    expect(effectiveHeaders('/')['cache-control']).toBe('s-maxage=3600, stale-while-revalidate=86400');
    expect(effectiveHeaders('/equipamentos')['cache-control']).toBe('s-maxage=3600, stale-while-revalidate=86400');
    expect(effectiveHeaders('/sw.js')['cache-control']).toBe('public, max-age=0, must-revalidate');
  });
});
