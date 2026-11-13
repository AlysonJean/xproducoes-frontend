// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { PageContextServer } from 'vike/types';
import { onRenderHtml } from '../../renderer/+onRenderHtml';
import { Page } from '../../pages/all/+Page';
import { formatPhoneDisplay } from '../data/site';
import { getWhatsAppPhone } from '../utils/whatsapp';

// Textos legais (13/11/2026): o nome empresarial completo, o CNPJ, o endereço com CEP, o e-mail, o telefone e o prazo
// de resposta (Decreto 7.962/2013, arts. 2º e 4º) chegam no HTML que o servidor entrega, no rodapé de cada página
// pública (o que o Google e quem abre sem JavaScript leem). Mesmo arranjo de privacidade.ssr.d8c.test.tsx: o app de
// verdade, pelo onRenderHtml que o api/ssr.js usa na Vercel.
vi.mock('react-router-dom', async () => await vi.importActual('react-router'));
vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  apiFetch: vi.fn(() => new Promise(() => {})),
}));

type VikeHtml = { _escaped?: string; _template?: { templateStrings: readonly string[]; templateVariables: readonly unknown[] } };
function htmlOf(part: unknown): string {
  if (typeof part === 'string') return part;
  const html = part as VikeHtml | null | undefined;
  if (typeof html?._escaped === 'string') return html._escaped;
  if (html?._template) {
    const { templateStrings, templateVariables } = html._template;
    return templateStrings.map((text, i) => text + (i < templateVariables.length ? htmlOf(templateVariables[i]) : '')).join('');
  }
  return part == null ? '' : String(part);
}

// O texto do rodapé: sem as marcas <!-- --> que o React põe entre textos vizinhos, sem as tags e com as entidades
// que aparecem nestes dados (apóstrofo de "d'Água" e "&").
async function footerOf(url: string) {
  const result = (await onRenderHtml({ Page, pageProps: {}, urlOriginal: url, exports: {} } as unknown as PageContextServer)) as {
    documentHtml: unknown;
  };
  const html = htmlOf(result.documentHtml);
  const footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
  const text = footer
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
  return { footer, text };
}

describe('Rodapé no HTML do servidor — dados obrigatórios da empresa', () => {
  it('em cada página pública: nome empresarial, CNPJ, endereço com CEP, e-mail, telefone e prazo de resposta', async () => {
    const phone = getWhatsAppPhone();
    for (const url of ['/', '/termos', '/contato', '/privacidade', '/orcamento']) {
      const { footer, text } = await footerOf(url);
      expect({ url, rodape: footer.length > 0 }).toEqual({ url, rodape: true });
      expect({ url, nome: text.includes('Nome empresarial: 55.343.824 ERNANE MOURA DA SILVA · CNPJ: 55.343.824/0001-56') }).toEqual({
        url,
        nome: true,
      });
      expect({ url, endereco: text.includes("Rua Flor d'Água, 407, Jardim Alvorada, Belo Horizonte - MG, CEP 30810-310") }).toEqual({
        url,
        endereco: true,
      });
      expect({ url, prazo: text.includes('Atendimento: respondemos em até 5 dias') }).toEqual({ url, prazo: true });
      expect({ url, email: footer.includes('href="mailto:suporte@xproducoeseeventos.com.br"') }).toEqual({ url, email: true });
      expect({ url, telefone: footer.includes(`href="tel:+${phone}"`) && text.includes(formatPhoneDisplay(phone)) }).toEqual({
        url,
        telefone: true,
      });
      // Revisão (13/11/2026): um telefone só no rodapé; o crédito do desenvolvedor fica sem número.
      expect({ url, telefones: text.match(/\(\d{2}\)\s?\d{4,5}-\d{4}/g) ?? [] }).toEqual({ url, telefones: [formatPhoneDisplay(phone)] });
    }
  }, 30_000);
});
