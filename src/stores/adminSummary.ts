// P3 (decisão aprovada em 02/11/2026): números do menu ("Reservas" e "Contatos") e cartão do topo do painel, com
// GET /dashboard/summary. O estado fica no módulo, fora dos componentes: cada tela do admin monta o próprio
// AdminLayout, e o menu remonta a cada troca de tela; guardado no componente, seria uma consulta por tela.
//
// Quando consulta: ao montar o menu ou o painel, ao voltar à aba (visibilitychange) e ao focar a janela, no máximo uma
// vez por minuto (teto), uma por vez (quem chama durante uma consulta espera a mesma) e nunca com a aba escondida.
// Depois de o admin mudar uma reserva ou um contato, refreshAdminSummary({ force: true }) consulta na hora, sem o teto.
// Nenhum temporizador: cada consulta passa por authenticateWithDB e acorda o banco (Neon grátis), então uma aba
// esquecida aberta não pode consultar sozinha. Só consulta com um menu ou painel de admin montado (quem não é admin
// nunca chama a rota).
import { useEffect, useSyncExternalStore } from 'react';
import { apiFetch } from '../services/api';
import { logger } from '../utils/logger';

export interface AdminSummary {
  /** Pedidos de clientes aguardando resposta: Pendente, evento por vir e sem proposta enviada. */
  waitingRequests: number;
  /** Quando foi criado o mais antigo deles (ISO), ou null sem nenhum. */
  oldestWaitingAt: string | null;
  /** Pedidos de clientes ainda Pendentes com a data do evento já passada. */
  pastEventRequests: number;
  /** Propostas enviadas que esperam o cliente (null se o servidor não souber contar). */
  proposalsAwaitingClient: number | null;
  /** Mensagens de contato não lidas. */
  unreadContacts: number;
}

export const SUMMARY_CEILING_MS = 60_000;

let summary: AdminSummary | null = null;
let fetchedAt = 0;
let inFlight: Promise<void> | null = null;
let forceAfterFlight = false;
let consumers = 0;
const listeners = new Set<() => void>();

const isHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function asSummary(data: unknown): AdminSummary | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (!isCount(d.waitingRequests) || !isCount(d.pastEventRequests) || !isCount(d.unreadContacts)) return null;
  return {
    waitingRequests: d.waitingRequests,
    oldestWaitingAt: typeof d.oldestWaitingAt === 'string' ? d.oldestWaitingAt : null,
    pastEventRequests: d.pastEventRequests,
    proposalsAwaitingClient: isCount(d.proposalsAwaitingClient) ? d.proposalsAwaitingClient : null,
    unreadContacts: d.unreadContacts,
  };
}

function fetchSummary(): Promise<void> {
  fetchedAt = Date.now();
  // Promise.resolve().then: um erro síncrono do apiFetch também cai no catch, nunca no render.
  const request = Promise.resolve()
    .then(() => apiFetch<AdminSummary>('/dashboard/summary'))
    .then((data) => {
      const next = asSummary(data);
      if (next) summary = next;
    })
    .catch((error: unknown) => {
      // Falha: fica o último resumo (ou nada, na primeira vez): nada de "0" inventado. O teto vale também aqui.
      logger.warn('Resumo do painel indisponível', 'adminSummary', error);
    })
    .finally(() => {
      inFlight = null;
      listeners.forEach((listener) => listener());
      // Uma mudança feita durante a consulta pode não ter entrado nela: consulta de novo, uma vez.
      if (forceAfterFlight) {
        forceAfterFlight = false;
        void refreshAdminSummary({ force: true });
      }
    });
  inFlight = request;
  return request;
}

/**
 * Atualiza o resumo. Sem `force`, respeita o teto de 1 minuto desde a última consulta. Com `force` (depois de mudar
 * uma reserva ou um contato), consulta na hora; se já houver uma consulta saindo, consulta de novo quando ela acabar.
 * Nunca consulta com a aba escondida nem sem um menu ou painel de admin montado.
 */
export function refreshAdminSummary(options: { force?: boolean } = {}): Promise<void> {
  if (consumers === 0 || isHidden()) return Promise.resolve();
  if (inFlight) {
    if (options.force) forceAfterFlight = true;
    return inFlight;
  }
  if (!options.force && fetchedAt > 0 && Date.now() - fetchedAt < SUMMARY_CEILING_MS) return Promise.resolve();
  return fetchSummary();
}

const onVisibilityChange = () => {
  if (!isHidden()) void refreshAdminSummary();
};
const onFocus = () => {
  void refreshAdminSummary();
};

function retain(): void {
  consumers += 1;
  if (consumers === 1) {
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
  }
}

function release(): void {
  consumers = Math.max(0, consumers - 1);
  if (consumers === 0) {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('focus', onFocus);
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => summary;
const getServerSnapshot = () => null;

/** `enabled` falso (quem não é admin, ou usuário ainda carregando): não consulta e devolve null. */
export function useAdminSummary(enabled = true): AdminSummary | null {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!enabled) return undefined;
    retain();
    void refreshAdminSummary();
    return release;
  }, [enabled]);

  return enabled ? value : null;
}

/** Só para testes: esquece o que já foi consultado. */
export function resetAdminSummaryForTests(): void {
  summary = null;
  fetchedAt = 0;
  inFlight = null;
  forceAfterFlight = false;
}

// ===== Textos e cores (menu e cartão) =====

const HOUR_MS = 60 * 60 * 1000;

export type WaitingTone = 'muted' | 'warning' | 'destructive';

/** Idade do pedido mais antigo e a cor: cinza até 4 h, amarelo até 24 h (o prazo que o site promete), vermelho depois. */
export function waitingAge(oldestWaitingAt: string | null, now: number = Date.now()): { hours: number; tone: WaitingTone } | null {
  if (!oldestWaitingAt) return null;
  const createdAt = Date.parse(oldestWaitingAt);
  if (Number.isNaN(createdAt)) return null;
  const ageMs = Math.max(0, now - createdAt);
  const tone: WaitingTone = ageMs <= 4 * HOUR_MS ? 'muted' : ageMs <= 24 * HOUR_MS ? 'warning' : 'destructive';
  return { hours: Math.floor(ageMs / HOUR_MS), tone };
}

/** "há 3 h" até 48 h; depois, "há 2 dias". */
export function formatWaitingAge(hours: number): string {
  if (hours < 1) return 'há menos de 1 h';
  if (hours < 48) return `há ${hours} h`;
  return `há ${Math.floor(hours / 24)} dias`;
}

export const WAITING_TONE_CLASSES: Record<WaitingTone, string> = {
  muted: 'bg-muted text-muted-foreground border-border',
  warning: 'bg-warning/10 text-warning border-warning/30',
  destructive: 'bg-destructive/10 text-destructive border-destructive/30',
};

export const waitingRequestsText = (count: number) =>
  `${count} ${count === 1 ? 'pedido aguardando' : 'pedidos aguardando'} resposta`;

export const unreadContactsText = (count: number) =>
  `${count} ${count === 1 ? 'mensagem não lida' : 'mensagens não lidas'}`;

export const pastEventRequestsText = (count: number) =>
  `${count} ${count === 1 ? 'pedido com data já passada' : 'pedidos com data já passada'}`;
