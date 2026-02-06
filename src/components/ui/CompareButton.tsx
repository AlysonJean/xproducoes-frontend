import { useCompare } from '../../contexts/CompareContext';
import { useNotifications } from '../../contexts/NotificationContext';
import type { Equipment } from '../../types/types';

interface CompareButtonProps {
  equipment: Equipment;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const CompareButton = ({ equipment, className = '', size = 'md' }: CompareButtonProps) => {
  const { addItem: addToCompare, removeItem: removeFromCompare, isInCompare, items } = useCompare();
  const canAddMore = items.length < 4;
  const { addNotification } = useNotifications();
  const inCompare = equipment.id ? isInCompare(equipment.id) : false;

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (inCompare && equipment.id) {
      removeFromCompare(equipment.id);
      addNotification({
        type: 'info',
        title: 'Removido da comparação',
        message: `${equipment.name} foi removido da comparação`,
      });
    } else if (!inCompare) {
      if (!canAddMore) {
        addNotification({
          type: 'warning',
          title: 'Limite atingido',
          message: 'Você pode comparar no máximo 4 equipamentos',
        });
        return;
      }

      addToCompare({ ...equipment, price: equipment.pricePerHour });
      addNotification({
        type: 'success',
        title: 'Adicionado à comparação',
        message: `${equipment.name} foi adicionado à comparação`,
      });
    }
  };

  const sizeClasses = {
    sm: 'icon-btn-sm',
    md: 'icon-btn',
    lg: 'icon-btn',
  } as const;

  return (
  <button
      onClick={handleToggle}
      disabled={!inCompare && !canAddMore}
      className={`
                ${sizeClasses[size]}
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        ${inCompare ? 'text-blue-500 hover:text-blue-600' : 'text-white hover:text-blue-300'}
        drop-shadow-lg hover:drop-shadow-xl
                ${className}
            `}
      title={inCompare ? 'Remover da comparação' : 'Adicionar à comparação'}
      aria-label={inCompare ? 'Remover da comparação' : 'Adicionar à comparação'}
    >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    </button>
  );
};

export default CompareButton;
