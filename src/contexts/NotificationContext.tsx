// Provider + hook(s) co-localizados de propósito (padrão oficial de Context do React) —
// só afeta a granularidade do Fast Refresh em dev, sem efeito em produção/correção.
/* eslint-disable react-refresh/only-export-components */
import { useState, useContext, createContext, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { NotificationList } from '../components/ui/NotificationList';

export interface Notification {

  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
export { NotificationContext };

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };

    setNotifications((prev) => [...prev, newNotification]);

    // Some sozinho depois do tempo do aviso. Teste do painel de 25/11/2026 (A-05, A-07, A-12): com 5 s para todos, o erro
    // de uma gravação recusada sumia antes de ser lido, e a ação parecia "falhar calada". Erro fica 10 s, aviso 8 s, o
    // resto 5 s (o X fecha antes).
    const duration = notification.duration || (notification.type === 'error' ? 10000 : notification.type === 'warning' ? 8000 : 5000);
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  }, [removeNotification]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = useMemo(() => ({
    notifications,
    addNotification,
    removeNotification,
    clearAll,
  }), [notifications, addNotification, removeNotification, clearAll]);

  return (
    <NotificationContext.Provider
      value={value}
    >
      {children}
      <NotificationList />
    </NotificationContext.Provider>
  );
};
