// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { PageContextServer } from 'vike/types';
import { onRenderHtml } from '../../renderer/+onRenderHtml';
import { Page } from '../../pages/all/+Page';

// D7 (aprovada em 02/11/2026): "tiro a conexão com o Google antes do aceite". O <head> de toda página do SSR trazia
// preconnect e dns-prefetch para www.googletagmanager.com e www.google-analytics.com: o navegador abria a conexão
// com o Google (e mandava o IP) antes de qualquer escolha no banner. A conexão com o GA só nasce quando o script
// carrega, depois do aceite. As fontes do Google ficam por enquanto (servir as fontes pelo próprio site é outra etapa).
// Mesmo arranjo de ssrNotFoundStatus.test.tsx e p15.propostaNoSsr.test.tsx: o app de verdade pelo onRenderHtml que o
// api/ssr.js usa em produção (pelo renderPage do Vike).
vi.mock('react-router-dom', async () => await vi.importActual('react-router'));
vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  apiFetch: vi.fn(() => new Promise(() => {})),
}));

function documentText(part: unknown): string {
  if (part && typeof part === 'object' && '_escaped' in part) return String((part as { _escaped: unknown })._escaped);
  if (part && typeof part === 'object' && '_template' in part) {
    const { templateStrings, templateVariables } = (part as { _template: { templateStrings: string[]; templateVariables: unknown[] } })._template;
    return templateStrings.map((chunk, i) => chunk + (i < templateVariables.length ? documentText(templateVariables[i]) : '')).join('');
  }
  return String(part ?? '');
}

async function htmlAt(url: string) {
  const result = await onRenderHtml({ Page, pageProps: {}, urlOriginal: url, exports: {} } as unknown as PageContextServer);
  return documentText((result as { documentHtml: unknown }).documentHtml);
}

describe('D7 — SSR sem conexão antecipada com o Google Analytics', () => {
  it.each(['/', '/equipamentos', '/cookies'])('%s: nenhum preconnect, dns-prefetch ou endereço do GA no HTML', async (url) => {
    const html = await htmlAt(url);

    expect(html).toContain('<html lang="pt-BR">');
    expect(html).not.toMatch(/googletagmanager\.com|google-analytics\.com/);
    // Os outros avisos de conexão continuam (Cloudinary e, até a próxima etapa, as fontes).
    expect(html).toContain('<link rel="preconnect" href="https://res.cloudinary.com" />');
    expect(html).toContain('<link rel="preconnect" href="https://fonts.googleapis.com" />');
  }, 30_000);
});
