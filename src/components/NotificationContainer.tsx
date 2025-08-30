import { useNotifications } from '../contexts/NotificationContext';
import type { Notification } from '../contexts/NotificationContext';
import { Button } from './ui/StandardComponents';

const NotificationItem = ({
  notification,
  onRemove,
}: {
  notification: Notification;
  onRemove: (id: string) => void;
}) => {
  const typeStyles = {
    success: 'bg-success border-success',
    error: 'bg-danger border-danger',
    warning: 'bg-warning border-warning',
    info: 'bg-accent border-accent',
  };

  const iconStyles = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div
      className={`${typeStyles[notification.type as keyof typeof typeStyles]} border-l-4 p-4 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-on-success text-lg font-bold">
            {iconStyles[notification.type as keyof typeof iconStyles]}
          </span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-primary">{notification.title}</h3>
          <p className="mt-1 text-sm text-secondary">{notification.message}</p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <Button
            onClick={() => onRemove(notification.id)}
            variant="ghost"
            size="sm"
            className="text-primary hover:text-tertiary px-2 py-1"
            aria-label="Fechar"
          >
            <span className="sr-only">Fechar</span>✕
          </Button>
        </div>
      </div>
    </div>
  );
};

export const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-4 max-w-sm w-full">
      {notifications.map((notification: Notification) => (
        <div key={notification.id}>
          <NotificationItem notification={notification} onRemove={removeNotification} />
        </div>
      ))}
    </div>
  );
};
