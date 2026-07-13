import React, { useState } from 'react';
import { ItemStatus } from '../../types/types';
import { clsx } from 'clsx';
import { Loader2, ChevronDown } from 'lucide-react';
import { logger } from '../../utils/logger';

interface StatusSelectProps {
  currentStatus: ItemStatus;
  onStatusChange: (newStatus: ItemStatus) => Promise<void>;
  disabled?: boolean;
}

export const StatusSelect: React.FC<StatusSelectProps> = ({ 
  currentStatus, 
  onStatusChange, 
  disabled = false 
}) => {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const statusConfig = {
    [ItemStatus.ACTIVE]: { label: 'Ativo', color: 'bg-emerald-500', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
    [ItemStatus.INACTIVE]: { label: 'Inativo', color: 'bg-red-500', bg: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    [ItemStatus.MAINTENANCE]: { label: 'Manutenção', color: 'bg-yellow-500', bg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
    [ItemStatus.COMING_SOON]: { label: 'Em Breve', color: 'bg-blue-500', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  };

  const handleSelect = async (status: ItemStatus) => {
    if (status === currentStatus) {
      setIsOpen(false);
      return;
    }

    try {
      setLoading(true);
      await onStatusChange(status);
      setIsOpen(false);
    } catch (error) {
      logger.error('Failed to change status', 'StatusSelect', error);
    } finally {
      setLoading(false);
    }
  };

  const currentConfig = statusConfig[currentStatus] || statusConfig[ItemStatus.INACTIVE];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
          currentConfig.bg,
          (disabled || loading) && "opacity-50 cursor-not-allowed"
        )}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        ) : (
          <div className={clsx("w-1.5 h-1.5 rounded-full mr-1.5", currentConfig.color)} />
        )}
        {currentConfig.label}
        <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
      </button>

      {isOpen && !disabled && !loading && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 z-20 mt-1 w-32 origin-top-right rounded-md bg-popover shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              {(Object.keys(statusConfig) as ItemStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleSelect(status)}
                  className={clsx(
                    "block w-full px-4 py-2 text-xs text-left hover:bg-muted/50 transition-colors",
                    currentStatus === status ? "text-primary font-medium bg-muted/30" : "text-popover-foreground"
                  )}
                >
                  <div className="flex items-center">
                    <div className={clsx("w-1.5 h-1.5 rounded-full mr-2", statusConfig[status].color)} />
                    {statusConfig[status].label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
