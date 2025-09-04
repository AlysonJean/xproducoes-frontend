import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import type { 
  ServiceWorkerState, 
  ServiceWorkerActions, 
  PerformanceMetrics 
} from '../types/types';

export const useServiceWorker = (): ServiceWorkerState & ServiceWorkerActions => {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isOnline: navigator.onLine,
    updateAvailable: false,
    registration: null,
  });

  // Registrar Service Worker
  const register = async (): Promise<void> => {
    if (!state.isSupported) {
      logger.warn('Service Worker not supported in this browser', 'ServiceWorker');
      return;
    }

    try {
      logger.debug('Registering Service Worker', 'ServiceWorker');
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      logger.info('Service Worker registered successfully', 'ServiceWorker', { scope: registration.scope });
      
      setState((prev) => ({
        ...prev,
        isRegistered: true,
        registration,
      }));

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              logger.info('New version available', 'ServiceWorker');
              setState((prev) => ({ ...prev, updateAvailable: true }));
            }
          });
        }
      });

    } catch (error) {
      logger.error('Service Worker registration failed', 'ServiceWorker', error);
    }
  };

  // Desregistrar Service Worker
  const unregister = async (): Promise<void> => {
    if (state.registration) {
      try {
        const unregistered = await state.registration.unregister();
        if (unregistered) {
          logger.info('Service Worker unregistered', 'ServiceWorker');
          setState((prev) => ({
            ...prev,
            isRegistered: false,
            registration: null,
          }));
        }
      } catch (error) {
        logger.error('Error unregistering Service Worker', 'ServiceWorker', error);
      }
    }
  };

  // Atualizar Service Worker
  const update = async (): Promise<void> => {
    if (state.registration) {
      try {
        await state.registration.update();
        window.location.reload();
      } catch (error) {
        logger.error('Error updating Service Worker', 'ServiceWorker', error);
      }
    }
  };

  // Enviar mensagem para Service Worker
  const sendMessage = (message: unknown): void => {
    if (state.registration && state.registration.active) {
      state.registration.active.postMessage(message);
    }
  };

  // Monitorar status online/offline
  useEffect(() => {
    const handleOnline = () => setState((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-registrar Service Worker
  useEffect(() => {
    if (state.isSupported && !state.isRegistered) {
      register();
    }
  }, [state.isSupported, state.isRegistered]);

  // Enviar métricas de performance para Service Worker
  useEffect(() => {
    const sendPerformanceMetrics = () => {
      if (window.performance && state.isRegistered) {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;

        const metrics: PerformanceMetrics = {
          type: 'PERFORMANCE_METRICS',
          metrics: {
            dns: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcp: navigation.connectEnd - navigation.connectStart,
            request: navigation.responseStart - navigation.requestStart,
            response: navigation.responseEnd - navigation.responseStart,
            dom: navigation.domContentLoadedEventEnd - navigation.responseEnd,
            load: navigation.loadEventEnd - navigation.loadEventStart,
            total: navigation.loadEventEnd - navigation.fetchStart,
          },
          timestamp: Date.now(),
        };

        sendMessage(metrics);
      }
    };

    const timer = setTimeout(sendPerformanceMetrics, 2000);
    return () => clearTimeout(timer);
  }, [state.isRegistered]);

  return {
    ...state,
    register,
    unregister,
    update,
    sendMessage,
  };
};

// Hook para detectar modo offline
export function useOfflineDetector(): boolean {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
}

// Hook para PWA Install Prompt
// Removed usePWAInstall: PWA install prompt handling intentionally disabled.
