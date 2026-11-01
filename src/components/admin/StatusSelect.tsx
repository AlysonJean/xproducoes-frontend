import React, { useEffect, useId, useRef, useState } from 'react';
import { ItemStatus } from '../../types/types';
import { clsx } from 'clsx';
import { Loader2, ChevronDown } from 'lucide-react';
import { logger } from '../../utils/logger';

interface StatusSelectProps {
  currentStatus: ItemStatus;
  onStatusChange: (newStatus: ItemStatus) => Promise<void>;
  disabled?: boolean;
}

// Tons por token (antes emerald/red/yellow/blue-100/800 com dark: à mão).
const statusConfig: Record<ItemStatus, { label: string; dot: string; chip: string }> = {
  [ItemStatus.ACTIVE]: { label: 'Ativo', dot: 'bg-success', chip: 'bg-success/10 text-success border-success/20' },
  [ItemStatus.INACTIVE]: { label: 'Inativo', dot: 'bg-destructive', chip: 'bg-destructive/10 text-destructive border-destructive/20' },
  [ItemStatus.MAINTENANCE]: { label: 'Manutenção', dot: 'bg-warning', chip: 'bg-warning/10 text-warning border-warning/20' },
  [ItemStatus.COMING_SOON]: { label: 'Em Breve', dot: 'bg-info', chip: 'bg-info/10 text-info border-info/20' },
};

export const StatusSelect: React.FC<StatusSelectProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Teclado: o menu não fechava com Esc nem recebia foco ao abrir.
  useEffect(() => {
    if (!isOpen) return;
    const first = menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
      || menuRef.current?.querySelector<HTMLButtonElement>('button');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const moveFocus = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button') || []);
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  const currentConfig = statusConfig[currentStatus] || statusConfig[ItemStatus.INACTIVE];

  return (
    <div className="relative inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label={`Status: ${currentConfig.label}. Alterar status`}
        className={clsx(
          "inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium cursor-pointer transition-colors hover:opacity-80",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          currentConfig.chip,
          (disabled || loading) && "opacity-50 cursor-not-allowed"
        )}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 mr-1 animate-spin" aria-hidden="true" />
        ) : (
          <span className={clsx("w-1.5 h-1.5 rounded-full mr-1.5", currentConfig.dot)} aria-hidden="true" />
        )}
        {currentConfig.label}
        <ChevronDown className="w-3 h-3 ml-1" aria-hidden="true" />
      </button>

      {isOpen && !disabled && !loading && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Alterar status"
            onKeyDown={moveFocus}
            className="absolute right-0 z-20 mt-1 w-36 origin-top-right rounded-md bg-popover text-popover-foreground border border-border shadow-lg"
          >
            <div className="py-1">
              {(Object.keys(statusConfig) as ItemStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  role="menuitemradio"
                  aria-checked={currentStatus === status}
                  onClick={() => handleSelect(status)}
                  className={clsx(
                    "block w-full px-4 py-2 text-sm text-left hover:bg-muted transition-colors focus-visible:outline-none focus-visible:bg-muted",
                    currentStatus === status ? "text-primary font-medium bg-muted/50" : "text-popover-foreground"
                  )}
                >
                  <span className="flex items-center">
                    <span className={clsx("w-1.5 h-1.5 rounded-full mr-2", statusConfig[status].dot)} aria-hidden="true" />
                    {statusConfig[status].label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
