import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

export const useServiceWorker = () => {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isOnline: navigator.onLine,
    updateAvailable: false,
    registration: null,
  });

  // Registrar Service Worker
  const register = async (): Promise<void> => {
    if (!state.isSupported) return;

    try {
      // Verificar se já existe um service worker registrado
      const existingRegistration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (existingRegistration) {
        logger.debug('Service Worker already registered', 'ServiceWorker');
        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration: existingRegistration,
        }));
        return;
      }

      logger.debug('Registering Service Worker', 'ServiceWorker');
      const reg = await navigator.serviceWorker.register('/sw.js');
      
      setState((prev) => ({
        ...prev,
        isRegistered: true,
        registration: reg,
      }));
      
      logger.info('Service Worker registered successfully', 'ServiceWorker', { scope: reg.scope });

      // Check for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
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
      const unregistered = await state.registration.unregister();
      if (unregistered) {
        logger.info('Service Worker unregistered', 'ServiceWorker');
        setState((prev) => ({
          ...prev,
          isRegistered: false,
          registration: null,
        }));
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
        logger.error('Service Worker update failed', 'ServiceWorker', error);
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

        const metrics = {
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
}

// Hook para detectar modo offline
export function useOfflineDetector() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Definir estado inicial correto após montagem no cliente
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

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

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
  prompt(): Promise<void>;
}

// Hook para PWA Install Prompt
export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        logger.info('PWA installed by user', 'PWA');
      } else {
        logger.info('User cancelled PWA installation', 'PWA');
      }

      setInstallPrompt(null);
      setIsInstallable(false);
    }
  };

  return {
    isInstallable,
    promptInstall,
  };
}
