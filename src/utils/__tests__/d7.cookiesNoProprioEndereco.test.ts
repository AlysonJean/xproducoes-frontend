// @vitest-environment-options {"url": "http://localhost:3000/"}
import { describe, it, expect, beforeEach } from 'vitest';
import { deleteGoogleAnalyticsCookies } from '../analyticsConsent';

// D7 (aprovada em 02/11/2026): "faço a recusa depois do aceite apagar os cookies". No site, o GA4 grava os cookies no
// domínio do site (.xproducoeseeventos.com.br; ver hooks/__tests__/d7.recusaEEquipe.test.tsx). Num endereço sem domínio
// acima (localhost, ou um endereço *.vercel.app, em que o navegador não aceita o domínio vercel.app), o cookie fica só no
// endereço e só sai quando é apagado sem o atributo domain. Este teste roda em http://localhost:3000.
const names = () =>
  document.cookie
    .split(';')
    .map((pair) => pair.split('=')[0].trim())
    .filter(Boolean)
    .sort();

describe('D7 — cookies do GA apagados no próprio endereço', () => {
  beforeEach(() => {
    for (const name of names()) document.cookie = `${name}=; Max-Age=0; path=/`;
  });

  it('_ga e _ga_* gravados só no endereço saem; os outros cookies ficam (inclusive um nome que só começa com _ga)', () => {
    document.cookie = '_ga=GA1.1.111.222; path=/';
    document.cookie = '_ga_TEST123=GS1.1.333; path=/';
    document.cookie = 'x_session=1; path=/';
    document.cookie = '_gaveta=1; path=/';

    deleteGoogleAnalyticsCookies();

    expect(names()).toEqual(['_gaveta', 'x_session']);
  });
});
