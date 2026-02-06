// packages/web/src/shared/modals/AlertModal.tsx
import React from 'react';
import { BaseModal } from './BaseModal';
import { Button } from '../ui/StandardComponents';
import { AlertModalProps } from '../../types/types';

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type,
  confirmText = 'Ok',
  className = '',
  size = 'md',
  ...props
}) => {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else if (onClose) {
      onClose();
    }
  };

  const typeStyles = {
    info: {
      bg: 'bg-accent/10',
      icon: 'text-accent',
      title: title || 'Informação',
      button: 'bg-accent hover:bg-accent/80 focus:ring-accent',
      text: 'text-primary',
      border: 'border-border',
    },
    success: {
      bg: 'bg-success/10',
      icon: 'text-success',
      title: title || 'Sucesso',
      button: 'bg-success hover:bg-success/80 focus:ring-success',
      text: 'text-primary',
      border: 'border-border',
    },
    warning: {
      bg: 'bg-warning/10',
      icon: 'text-warning',
      title: title || 'Atenção',
      button: 'bg-warning hover:bg-warning/80 focus:ring-warning',
      text: 'text-primary',
      border: 'border-border',
    },
    error: {
      bg: 'bg-danger/10',
      icon: 'text-danger',
      title: title || 'Erro',
      button: 'bg-danger hover:bg-danger/80 focus:ring-danger',
      text: 'text-primary',
      border: 'border-border',
    },
  };

  const currentType = typeStyles[type as keyof typeof typeStyles ?? 'info'];

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={currentType.title}
      className={className}
      size={size}
      showCloseButton={false}
      {...props}
    >
      <div className="sm:flex sm:items-start">
        <div
          className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${currentType.bg} ${currentType.icon} sm:mx-0 sm:h-10 sm:w-10`}
        >
          {getIcon()}
        </div>
        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
          <div className="mt-2">
            <p className="text-sm text-tertiary">{message}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <Button
          type="button"
          variant={type === 'error' ? 'destructive' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'primary'}
          onClick={handleConfirm}
          fullWidth
          className="sm:ml-3 sm:w-auto sm:text-sm"
        >
          {confirmText}
        </Button>
      </div>
    </BaseModal>
  );
};
