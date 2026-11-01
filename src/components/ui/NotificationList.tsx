import { useNotifications, Notification } from '../../contexts/NotificationContext';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'; // Assumindo heroic-icons, se nao tiver uso svg

const icons = {
    success: <CheckCircleIcon className="w-6 h-6 text-success" aria-hidden="true" />,
    error: <ExclamationCircleIcon className="w-6 h-6 text-destructive" aria-hidden="true" />,
    warning: <ExclamationTriangleIcon className="w-6 h-6 text-warning" aria-hidden="true" />,
    info: <InformationCircleIcon className="w-6 h-6 text-info" aria-hidden="true" />
};

const bgColors = {
    success: 'bg-success/10 border-success',
    error: 'bg-destructive/10 border-destructive',
    warning: 'bg-warning/10 border-warning',
    info: 'bg-info/10 border-info'
};

const NotificationItem = ({ notification }: { notification: Notification }) => {
    const { removeNotification } = useNotifications();
    const Icon = icons[notification.type];
    // Achado (auditoria do design system): toda notificação era role="alert" (interrompe o leitor de
    // tela) — só erro/aviso precisam disso; sucesso/informação são anunciados com educação (status).
    const isUrgent = notification.type === 'error' || notification.type === 'warning';

    return (
        // Fundo opaco (bg-card) por baixo da cor do status a 10%: só a camada translúcida deixava o
        // conteúdo da página aparecer através do aviso.
        <div
            className="mb-3 w-80 max-w-[calc(100vw-2rem)] rounded-lg bg-card shadow-lg animate-in fade-in slide-in-from-right-5"
            // Erro/aviso interrompem (alert); sucesso/informação são anunciados pela região
            // aria-live="polite" do contêiner, que fica sempre montado.
            role={isUrgent ? 'alert' : undefined}
        >
          <div className={`flex items-start p-4 rounded-lg border ${bgColors[notification.type]}`}>
            <div className="flex-shrink-0 mr-3">
                {Icon}
            </div>
            <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">{notification.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground break-words">{notification.message}</p>
            </div>
            <button 
                onClick={() => removeNotification(notification.id)}
                type="button"
                className="ml-3 flex-shrink-0 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar notificação"
                title="Fechar"
            >
                <XMarkIcon className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
    );
};

export const NotificationList = () => {
    const { notifications } = useNotifications();

    // Achado (revisão da auditoria):
    // - z-[60]: o Modal agora vai por portal para o fim do <body> com z-50 — com o mesmo z-index vence
    //   quem vem depois no DOM, e o fundo do modal cobria os avisos (erro de salvar dentro do modal
    //   ficava invisível, e clicar no "fechar" do aviso acertava o fundo e fechava o modal).
    // - Contêiner sempre montado: uma região aria-live criada já com o conteúdo costuma não ser
    //   anunciada pelos leitores de tela.
    return (
        <div aria-live="polite" className="fixed top-4 right-4 z-[60] flex flex-col items-end pointer-events-none">
            <div className="pointer-events-auto">
                {notifications.map(notification => (
                    <NotificationItem key={notification.id} notification={notification} />
                ))}
            </div>
        </div>
    );
};
