import { useNotifications, Notification } from '../../contexts/NotificationContext';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'; // Assumindo heroic-icons, se nao tiver uso svg

const icons = {
  success: <CheckCircleIcon className="w-6 h-6 text-green-500" />,
  error: <ExclamationCircleIcon className="w-6 h-6 text-red-500" />,
  warning: <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />,
  info: <InformationCircleIcon className="w-6 h-6 text-blue-500" />
};

const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
};

const NotificationItem = ({ notification }: { notification: Notification }) => {
    const { removeNotification } = useNotifications();
    const Icon = icons[notification.type];

    return (
        <div 
            className={`flex items-start p-4 mb-3 w-80 rounded-lg border shadow-lg transform transition-all duration-300 translate-x-0 ${bgColors[notification.type]} animate-in fade-in slide-in-from-right-5`}
            role="alert"
        >
            <div className="flex-shrink-0 mr-3">
                {Icon}
            </div>
            <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">{notification.title}</h4>
                <p className="mt-1 text-sm text-gray-600 break-words">{notification.message}</p>
            </div>
            <button 
                onClick={() => removeNotification(notification.id)}
                className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-500 focus:outline-none"
                aria-label="Fechar notificação"
                title="Fechar"
            >
                <XMarkIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

export const NotificationList = () => {
    const { notifications } = useNotifications();

    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col items-end pointer-events-none">
            <div className="pointer-events-auto">
                {notifications.map(notification => (
                    <NotificationItem key={notification.id} notification={notification} />
                ))}
            </div>
        </div>
    );
};
