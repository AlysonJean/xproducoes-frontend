// P3 (decisão aprovada em 02/11/2026): pedido de cliente esperando resposta só aparecia na lista de
// Reservas. Este hook alimenta o número do menu "Reservas" e o cartão do topo do painel com
// GET /admin/bookings/pending-summary. Consulta ao abrir a tela e ao voltar à aba, no máximo uma vez
// por minuto, e nunca com a aba escondida: cada consulta passa por authenticateWithDB e acorda o
// banco (Neon grátis). O menu e o cartão dividem a mesma consulta (estado do módulo).
import { useEffect, useSyncExternalStore } from 'react';
import { apiFetch } from '../services/api';
import { logger } from '../utils/logger';

export type PendingLevel = 'gray' | 'yellow' | 'red';

export interface PendingRequestsSummary {
  count: number;
  oldestCreatedAt: string | null;
  oldestAgeHours: number | null;
  level: PendingLevel | null;
  pastEventCount: number;
}

export const PENDING_REFRESH_MS = 60_000;

let lastFetchAt = 0;
let current: PendingRequestsSummary | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** Só para testes: esquece o que já foi consultado. */
export function resetPendingRequestsCache(): void {
  lastFetchAt = 0;
  current = null;
  inflight = null;
}

function refresh(): void {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  if (inflight || Date.now() - lastFetchAt < PENDING_REFRESH_MS) return;
  lastFetchAt = Date.now();
  // Promise.resolve().then: um erro síncrono do apiFetch também cai no catch, nunca no render.
  inflight = Promise.resolve()
    .then(() => apiFetch<PendingRequestsSummary>('/admin/bookings/pending-summary'))
    .then((summary) => {
      current = summary && typeof summary.count === 'number' ? summary : null;
      listeners.forEach((listener) => listener());
    })
    .catch((error: unknown) => {
      // Sem o resumo, o menu fica sem número e o cartão some: nada de "0" inventado.
      logger.warn('Resumo de pedidos pendentes indisponível', 'usePendingRequests', error);
    })
    .finally(() => {
      inflight = null;
    });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => current;
const getServerSnapshot = () => null;

/** `enabled` falso (quem não é admin, ou usuário ainda carregando): não consulta e devolve null. */
export function usePendingRequests(enabled = true): PendingRequestsSummary | null {
  const summary = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!enabled) return undefined;
    refresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [enabled]);

  return enabled ? summary : null;
}

/** "há 3 h", "há 2 dias" — idade do pedido mais antigo. */
export function formatPendingAge(hours: number | null): string {
  if (hours === null) return '';
  if (hours < 1) return 'há menos de 1 h';
  if (hours < 48) return `há ${hours} h`;
  return `há ${Math.floor(hours / 24)} dias`;
}

/** Classes da cor da faixa: cinza até 4 h, amarelo até 24 h, vermelho depois. */
export const PENDING_LEVEL_CLASSES: Record<PendingLevel, string> = {
  gray: 'bg-muted text-muted-foreground border-border',
  yellow: 'bg-warning/10 text-warning border-warning/30',
  red: 'bg-destructive/10 text-destructive border-destructive/30',
};
