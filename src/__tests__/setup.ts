import '@testing-library/jest-dom'

// jsdom não implementa IntersectionObserver (usado por hooks como useRevealOnView, via
// PageLayout) — sem este mock, qualquer teste que renderize uma página real envolvida em
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