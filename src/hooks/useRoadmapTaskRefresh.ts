import { useEffect, useRef } from 'react';
import { collaboratorProfileAPI } from '../services/api';
import { logger } from '../utils/logger';

// D5 (aprovada em 02/11/2026): em produção o Roteiro não tem tempo real (nenhuma conexão em tempo real chega
// com login, porque o cookie do site não vai para o endereço do servidor). As tarefas são recarregadas em
// silêncio, sem a tela de carregamento: a cada 60 s com a aba visível e na hora em que a aba volta a ficar
// visível. Para um Roteiro esquecido aberto não manter o banco (Neon grátis) acordado, a recarga para 4 h
// depois do fim do evento (a mesma regra da TV do mural, D22) e só volta com uma nova interação (toque,
// tecla ou a aba voltando), por mais 2 h.
export const TASKS_REFRESH_MS = 60_000;
export const TASKS_AFTER_EVENT_END_MS = 4 * 60 * 60 * 1000;
export const TASKS_RESUME_MS = 2 * 60 * 60 * 1000;
// Onda 3 da auditoria de 19/11 (F9-14): a recarga a cada 60 s só começa 6 h antes da montagem (ou do início do evento).
// Antes, o Roteiro aberto dias antes do evento recarregava sem parar até 4 h depois do fim, e mantinha o banco
// acordado por dias. Antes da janela, só recarrega quando a aba volta a ficar visível.
export const TASKS_BEFORE_START_MS = 6 * 60 * 60 * 1000;

export function useRoadmapTaskRefresh<T>(
  bookingId: string | undefined,
  eventEnd: string | null | undefined,
  onTasks: (tasks: T[]) => void,
  eventStart?: string | null,
) {
  const onTasksRef = useRef(onTasks);
  useEffect(() => {
    onTasksRef.current = onTasks;
  }, [onTasks]);

  useEffect(() => {
    if (!bookingId) return;
    const end = eventEnd ? Date.parse(eventEnd) : NaN;
    // Sem horário de fim conhecido, vale a janela da retomada (2 h a partir de agora).
    let activeUntil = Number.isFinite(end) ? end + TASKS_AFTER_EVENT_END_MS : Date.now() + TASKS_RESUME_MS;
    const start = eventStart ? Date.parse(eventStart) : NaN;
    const activeFrom = Number.isFinite(start) ? start - TASKS_BEFORE_START_MS : -Infinity;
    const beforeWindow = () => Date.now() < activeFrom;
    let interval: ReturnType<typeof setInterval> | null = null;
    let disposed = false;

    const refresh = async () => {
      try {
        const response = await collaboratorProfileAPI.getEventTasks(bookingId);
        // O interceptor do axios já tira o envelope { success, data }; aceita os dois formatos.
        const payload = response.data as T[] | { data?: T[] } | undefined;
        const tasks = Array.isArray(payload) ? payload : payload?.data;
        if (!disposed && Array.isArray(tasks)) onTasksRef.current(tasks);
      } catch (error) {
        logger.warn('Falha ao recarregar as tarefas do Roteiro', 'useRoadmapTaskRefresh', error);
      }
    };

    const expired = () => Date.now() > activeUntil;
    const stop = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };
    const tick = () => {
      if (expired()) {
        stop();
        return;
      }
      if (document.hidden || beforeWindow()) return;
      void refresh();
    };
    const startInterval = () => {
      if (!interval) interval = setInterval(tick, TASKS_REFRESH_MS);
    };
    // Passado o prazo, uma nova interação (ou a aba voltando) reabre a recarga por 2 h.
    const resume = () => {
      activeUntil = Date.now() + TASKS_RESUME_MS;
      startInterval();
      void refresh();
    };
    const onVisibilityChange = () => {
      if (document.hidden) return;
      if (expired()) resume();
      else void refresh();
    };
    const onInteraction = () => {
      if (expired()) resume();
    };

    if (!expired()) startInterval();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pointerdown', onInteraction);
    window.addEventListener('keydown', onInteraction);
    return () => {
      disposed = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pointerdown', onInteraction);
      window.removeEventListener('keydown', onInteraction);
    };
  }, [bookingId, eventEnd, eventStart]);
}
