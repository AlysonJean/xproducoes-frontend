import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { sentry } = vi.hoisted(() => ({ sentry: { addBreadcrumb: vi.fn(), captureMessage: vi.fn() } }));
vi.mock('@sentry/react', () => sentry);

import { useWebVitals } from '../useWebVitals';

// Um PerformanceObserver de mentira (o jsdom não tem): guarda o callback de cada tipo para o teste disparar a medição.
const callbacks = new Map<string, PerformanceObserverCallback>();
class FakeObserver {
  static supportedEntryTypes = ['largest-contentful-paint', 'layout-shift', 'event'];
  constructor(private readonly callback: PerformanceObserverCallback) {}
  observe(options: { type: string }) {
    callbacks.set(options.type, this.callback);
  }
  disconnect() {}
}
const medir = (type: string, entries: object[]) =>
  callbacks.get(type)!({ getEntries: () => entries } as unknown as PerformanceObserverEntryList, {} as PerformanceObserver);

// Auditoria completa (19/11/2026): cada medição (LCP, CLS, TTFB e cada interação acima de 40 ms) virava um evento no
// Sentry (captureMessage), de 5 a 20 por visita: a cota grátis acabava e os erros de verdade deixavam de chegar. A medição
// fica só como breadcrumb, que vai junto como contexto quando um erro de verdade é registrado.
describe('useWebVitals — só breadcrumb, nenhum evento no Sentry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callbacks.clear();
    vi.stubGlobal('PerformanceObserver', FakeObserver);
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{ fetchStart: 10, responseStart: 310 } as unknown as PerformanceEntry]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('TTFB, LCP, CLS e INP: um breadcrumb por medição e nenhum captureMessage', () => {
    renderHook(() => useWebVitals());

    medir('largest-contentful-paint', [{ startTime: 1800 }]);
    medir('layout-shift', [{ hadRecentInput: false, value: 0.3 }]);
    medir('event', [{ duration: 260, startTime: 5000 }]);

    expect(sentry.captureMessage).not.toHaveBeenCalled();
    expect(sentry.addBreadcrumb.mock.calls.map(([crumb]) => [crumb.category, crumb.message, crumb.level])).toEqual([
      ['web-vital', 'TTFB: 300ms (good)', 'info'],
      ['web-vital', 'LCP: 1800ms (good)', 'info'],
      ['web-vital', 'CLS: 0.3ms (poor)', 'error'],
      ['web-vital', 'INP: 260ms (needs-improvement)', 'warning'],
    ]);
  });
});
