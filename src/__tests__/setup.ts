import '@testing-library/jest-dom'

// jsdom não implementa IntersectionObserver (usado por componentes com carregamento sob demanda,
// como imagens otimizadas) — sem este mock, qualquer teste que renderize uma página real envolvida em
// PageLayout quebra com "IntersectionObserver is not defined", mesmo sem relação alguma
// com o que o teste está de fato verificando.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
}
// Teste do painel de 25/11/2026 (A-10): a Proposta rápida passou a buscar o endereço pelo CEP (ViaCEP). Nenhum teste sai
// para a internet: sem um fetch do próprio teste (vi.stubGlobal), o ViaCEP responde "CEP não encontrado" e a tela segue
// com o que foi digitado.
const realFetch = globalThis.fetch;
if (typeof realFetch === 'function') {
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('viacep.com.br')) {
      return Promise.resolve(new Response(JSON.stringify({ erro: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return realFetch(input, init);
  }) as typeof fetch;
}
