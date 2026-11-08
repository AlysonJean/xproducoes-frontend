import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
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
  // D8b (aprovada em 02/11/2026): a regra geral vinha depois da de /assets e, para a mesma chave, vale a última que
  // casou — o cache de 1 ano dos arquivos com hash nunca valia (o navegador revalidava tudo). A geral vem primeiro.
  it('arquivos do build (/assets, com hash no nome) ficam 1 ano no navegador, com os cabeçalhos de segurança', () => {
    for (const path of ['/assets/index-abc123.js', '/assets/Logo-xproducoes-eventos-abc123.lottie']) {
      const headers = effectiveHeaders(path);
      expect(headers['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['x-content-type-options']).toBe('nosniff');
    }
    expect(effectiveHeaders('/')['cache-control']).toBe('s-maxage=3600, stale-while-revalidate=86400');
  });

  it('nada mais aponta para /animations (o .lottie foi para o build)', () => {
    expect(JSON.stringify(vercelConfig)).not.toContain('/animations');
    expect(existsSync(new URL('../../public/animations', import.meta.url))).toBe(false);
  });

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

  // P15 (aprovada em 02/11/2026): a página da proposta (/proposta#token=... e o endereço antigo /proposta/<número>)
  // sai marcada para não indexar e sem Referer. As regras vêm depois da regra geral, então valem sobre ela; os outros
  // cabeçalhos de segurança da regra geral continuam.
  it('página da proposta: noindex, nofollow e Referrer-Policy no-referrer, só nela', () => {
    for (const path of ['/proposta', '/proposta/XP-ANA-20271220-2200-AB1']) {
      const headers = effectiveHeaders(path);
      expect(headers['x-robots-tag']).toBe('noindex, nofollow');
      expect(headers['referrer-policy']).toBe('no-referrer');
      expect(headers['x-frame-options']).toBe('DENY');
    }
    for (const path of ['/', '/propostas', '/equipamentos', '/api/v1/proposals/view']) {
      expect(effectiveHeaders(path)['x-robots-tag']).toBeUndefined();
      expect(effectiveHeaders(path)['referrer-policy']).toBe('strict-origin-when-cross-origin');
    }
  });

  it('páginas mantêm o cache do HTML do SSR e o service worker continua sem cache', () => {
    expect(effectiveHeaders('/')['cache-control']).toBe('s-maxage=3600, stale-while-revalidate=86400');
    expect(effectiveHeaders('/equipamentos')['cache-control']).toBe('s-maxage=3600, stale-while-revalidate=86400');
    expect(effectiveHeaders('/sw.js')['cache-control']).toBe('public, max-age=0, must-revalidate');
  });
});
