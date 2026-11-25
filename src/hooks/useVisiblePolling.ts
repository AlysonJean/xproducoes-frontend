import { useEffect, useRef, useState } from 'react';

// WhatsApp pelo painel (pedido de Alyson de 24/11/2026): a tela se atualiza sozinha enquanto está aberta e visível.
// Para não manter o servidor (e o banco do plano gratuito) acordado à toa, a atualização para com a aba escondida e
// também quando ninguém mexe na tela por um tempo (`idleMs`); volta no primeiro clique ou tecla, já atualizando.

export const DEFAULT_IDLE_MS = 10 * 60 * 1000;

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

export interface VisiblePollingOptions {
  enabled?: boolean;
  idleMs?: number;
}

/**
 * Chama `callback` a cada `intervalMs` com a aba visível e alguém usando a tela. Nunca duas chamadas ao mesmo tempo
 * (a próxima espera a anterior terminar). Devolve `paused` quando parou por falta de uso.
 */
export function useVisiblePolling(
  callback: () => unknown,
  intervalMs: number,
  { enabled = true, idleMs = DEFAULT_IDLE_MS }: VisiblePollingOptions = {}
): { paused: boolean } {
  const callbackRef = useRef(callback);
  const [paused, setPaused] = useState(false);

  // A chamada mais recente (a tela troca a função a cada mudança), sem reiniciar o relógio.
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return undefined;
    let lastActivity = Date.now();
    let isPaused = false;
    let inFlight = false;

    const run = () => {
      if (inFlight) return;
      inFlight = true;
      Promise.resolve()
        .then(() => callbackRef.current())
        .catch(() => undefined)
        .finally(() => {
          inFlight = false;
        });
    };

    const tick = () => {
      if (document.hidden) return;
      if (Date.now() - lastActivity >= idleMs) {
        if (!isPaused) {
          isPaused = true;
          setPaused(true);
        }
        return;
      }
      run();
    };

    const onActivity = () => {
      lastActivity = Date.now();
      if (isPaused) {
        isPaused = false;
        setPaused(false);
        run();
      }
    };

    const onVisibility = () => {
      if (!document.hidden && !isPaused) run();
    };

    const timer = window.setInterval(tick, intervalMs);
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, onActivity, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, onActivity);
      document.removeEventListener('visibilitychange', onVisibility);
      setPaused(false);
    };
  }, [enabled, intervalMs, idleMs]);

  return { paused: enabled && paused };
}
