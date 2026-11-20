import { describe, it, expect } from 'vitest';
import { SELO_SCRIPT_URL, carregarSeloAssinatura, seloScriptSrc } from '../seloAssinatura';

// Decisão de Alyson (20/11/2026), selo de assinatura com atualização automática: o script vem do main do repositório do
// selo pelo jsDelivr, com a hora no endereço para o navegador não ficar 7 dias com a versão antiga.

const novoDocumento = () => document.implementation.createHTMLDocument('selo');
const scriptsDoSelo = (doc: Document) => doc.head.querySelectorAll('script[data-selo-assinatura]');

describe('selo de assinatura: endereço do script', () => {
  it('acompanha o main do repositório público do selo no jsDelivr', () => {
    expect(SELO_SCRIPT_URL).toBe('https://cdn.jsdelivr.net/gh/AlysonJean/x-solucoes-digitais@main/selo/selo.js');
  });

  it('leva a hora (horas inteiras desde 1970, em UTC): muda a cada hora e é igual dentro da mesma hora', () => {
    const t = Date.UTC(2026, 10, 20, 14, 0, 0);
    expect(seloScriptSrc(t)).toBe(`${SELO_SCRIPT_URL}?h=${t / 3_600_000}`);
    expect(seloScriptSrc(t + 59 * 60_000 + 59_000)).toBe(seloScriptSrc(t));
    expect(seloScriptSrc(t + 3_600_000)).toBe(`${SELO_SCRIPT_URL}?h=${t / 3_600_000 + 1}`);
    expect(seloScriptSrc(t - 1)).toBe(`${SELO_SCRIPT_URL}?h=${t / 3_600_000 - 1}`);
  });
});

describe('selo de assinatura: carregar o script', () => {
  it('põe um script assíncrono, sem referrer, com o endereço da hora', () => {
    const doc = novoDocumento();
    const t = Date.UTC(2026, 10, 20, 14, 30);
    carregarSeloAssinatura(doc, t);

    const scripts = scriptsDoSelo(doc);
    expect(scripts).toHaveLength(1);
    const script = scripts[0] as HTMLScriptElement;
    expect(script.getAttribute('src')).toBe(seloScriptSrc(t));
    expect(script.async).toBe(true);
    expect(script.getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it('pede uma vez só por página, mesmo chamado de novo em outra hora', () => {
    const doc = novoDocumento();
    const t = Date.UTC(2026, 10, 20, 14, 30);
    carregarSeloAssinatura(doc, t);
    carregarSeloAssinatura(doc, t + 3_600_000);

    const scripts = scriptsDoSelo(doc);
    expect(scripts).toHaveLength(1);
    expect(scripts[0].getAttribute('src')).toBe(seloScriptSrc(t));
  });

  it('não pede o script quando a tag <x-selo> já existe na página (definida por outro script)', () => {
    // document (o do jsdom) tem defaultView com customElements; o createHTMLDocument dos outros testes não tem.
    const head = document.head;
    customElements.define('x-selo', class extends HTMLElement {});
    carregarSeloAssinatura();
    expect(scriptsDoSelo(document)).toHaveLength(0);
    expect(head.querySelector(`script[src^="${SELO_SCRIPT_URL}"]`)).toBeNull();
  });
});
