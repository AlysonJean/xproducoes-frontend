// packages/web/src/shared/modals/ConfirmModal.tsx
import React from 'react';
import { BaseModal } from './BaseModal';
import { Button, Alert } from '../ui/StandardComponents';
import { ConfirmModalProps } from '../../types/types';

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar ação',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  isLoading = false,
  className = '',
  size = 'md',
  ...props
}) => {
  const handleConfirm = () => {
    if (!isLoading && onConfirm) {
      onConfirm();
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case 'danger':
        return 'destructive' as const;
      case 'warning':
        return 'warning' as const;
      case 'success':
        return 'success' as const;
      default:
        return 'primary' as const;
    }
  };

  const getAlertVariant = () => {
    switch (variant) {
      case 'danger':
        return 'error' as const;
      case 'warning':
        return 'warning' as const;
      case 'success':
        return 'success' as const;
      default:
        return 'info' as const;
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return '⚠️';
      case 'warning':
        return '⚡';
      case 'success':
        return '✅';
      default:
        return '❓';
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      className={className}
      size={size}
      showCloseButton={false}
      {...props}
    >
      <div className="space-y-6">
        <Alert variant={getAlertVariant()}>
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getIcon()}</span>
            <p className="text-sm leading-relaxed">{message}</p>
          </div>
        </Alert>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={getButtonVariant()}
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};
