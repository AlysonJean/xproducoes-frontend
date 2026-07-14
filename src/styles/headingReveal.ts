// Global heading reveal and styling application
// Applies 'heading-elegant' to all h1/h2 and reveals them on viewport

(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const REVEAL_CLASS = 'is-visible';
  const HEADING_CLASS = 'heading-elegant';

  const applyHeadingClass = (el: Element) => {
    if (!(el instanceof HTMLElement)) return;
    if (!el.classList.contains(HEADING_CLASS)) el.classList.add(HEADING_CLASS);
  };

  const observeReveal = (() => {
    let io: IntersectionObserver | null = null;
    const ensureObserver = () => {
      if (io) return io;
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const target = entry.target as HTMLElement;
            if (entry.isIntersecting) {
              target.classList.add(REVEAL_CLASS);
              io?.unobserve(target);
            }
          }
        },
        { threshold: 0.2 }
      );
      return io;
    };
    return (el: Element) => {
      const target = el as HTMLElement;
      // If already visible on load, mark visible immediately
      const rect = target.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
      if (inView) target.classList.add(REVEAL_CLASS);
      ensureObserver().observe(target);
    };
  })();

  const process = (root: ParentNode | Document = document) => {
    const nodes = root.querySelectorAll('h1, h2');
    nodes.forEach((node) => {
      applyHeadingClass(node);
      observeReveal(node);
    });
  };

  // Achado (hydration mismatch em produção real, exposto ao corrigir o CLS da home):
  // esta varredura inicial mutava classList de <h1>/<h2> diretamente no DOM assim que o
  // módulo carregava — se isso corresse ANTES do commit de hidratação do React, o React
  // via os atributos "errados" no DOM já hidratado e os revertia silenciosamente
  // ("won't be patched up"), fazendo o heading perder a classe elegant/reveal na carga
  // inicial. Um atraso fixo de N frames não é confiável (a hidratação de uma árvore maior
  // pode levar mais que isso, especialmente em dev); requestIdleCallback espera o main
  // thread realmente ficar ocioso, o que só acontece depois que o trabalho síncrono/agendado
  // do React (incluindo hidratação) já cedeu o controle.
  const scheduleAfterHydration = (fn: () => void) => {
    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof w.requestIdleCallback === 'function') {
      // requestIdleCallback chama fn(deadline) de verdade (IdleDeadline), diferente da
      // assinatura simplificada declarada acima — passar `fn` direto faria `process`
      // receber o IdleDeadline no lugar do parâmetro `root`, quebrando
      // `root.querySelectorAll` (achado rodando smoke test local: TypeError real,
      // silenciosamente engolido, fazendo a varredura inicial nunca rodar de verdade).
      w.requestIdleCallback(() => fn(), { timeout: 2000 });
    } else {
      setTimeout(() => fn(), 300);
    }
  };

  const runInitial = () => {
    scheduleAfterHydration(process);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInitial);
  } else {
    runInitial();
  }

  // Watch for dynamically added headings
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        const el = node as Element;
        if (el.matches && (el.matches('h1') || el.matches('h2'))) {
          applyHeadingClass(el);
          observeReveal(el);
        }
        // Also scan children in case a container was added
        if ('querySelectorAll' in el) {
          const descendants = el.querySelectorAll('h1, h2');
          descendants.forEach((d) => {
            applyHeadingClass(d);
            observeReveal(d);
          });
        }
      });
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();

export {};
