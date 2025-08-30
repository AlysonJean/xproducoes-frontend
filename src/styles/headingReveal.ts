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

  // Initial run
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => process());
  } else {
    process();
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
