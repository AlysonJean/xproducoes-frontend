import { useEffect, useRef } from 'react';

/**
 * useRevealOnView
 * Adiciona a classe 'is-visible' ao elemento quando entra em viewport (uma vez).
 * Útil para disparar micro-animações como sublinhado de headings.
 */
export function useRevealOnView<T extends HTMLElement>(options?: {
  threshold?: number;
  rootMargin?: string;
}): { ref: React.RefObject<T> } {
  const { threshold = 0.2, rootMargin = '0px' } = options ?? {};
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const applyIfInView = () => {
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * (1 - threshold / 2) && rect.bottom > 0;
      if (inView) el.classList.add('is-visible');
    };

    applyIfInView();

    const observer = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        }
      },
      { root: null, threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return { ref };
}
