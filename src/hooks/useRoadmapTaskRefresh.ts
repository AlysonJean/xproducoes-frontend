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

export function useRoadmapTaskRefresh<T>(
  bookingId: string | undefined,
  eventEnd: string | null | undefined,
  onTasks: (tasks: T[]) => void,
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
      if (document.hidden) return;
      void refresh();
    };
    const start = () => {
      if (!interval) interval = setInterval(tick, TASKS_REFRESH_MS);
    };
    // Passado o prazo, uma nova interação (ou a aba voltando) reabre a recarga por 2 h.
    const resume = () => {
      activeUntil = Date.now() + TASKS_RESUME_MS;
      start();
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

    if (!expired()) start();
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
  }, [bookingId, eventEnd]);
}
