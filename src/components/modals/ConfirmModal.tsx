// packages/web/src/shared/modals/ConfirmModal.tsx
import React, { ReactNode } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { ConfirmModalProps } from '../../types/types';

// Achado (auditoria do design system): `message` só aceitava string e `children` era descartado —
// o ConfirmModal repassava os próprios filhos ao modal base, por cima dos de quem chamava. O
// WhatsAppConfirmationModal mandava a prévia da mensagem como children e o admin confirmava o envio
// sem ver o texto. Agora `message` aceita ReactNode e `children` aparece abaixo da mensagem.
// (Importa Modal/Button/Alert direto dos arquivos: via StandardComponents era import circular, porque
// o barrel reexporta este ConfirmModal.)
type ConfirmModalComponentProps = Omit<ConfirmModalProps, 'message'> & {
  message?: ReactNode;
};

export const ConfirmModal: React.FC<ConfirmModalComponentProps> = ({
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
  children,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  showCloseButton = false,
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

  const hasMessage = message !== undefined && message !== null && message !== '';

  return (
    <Modal
      isOpen={!!isOpen}
      onClose={() => onClose?.()}
      title={title}
      className={className}
      size={size}
      showCloseButton={showCloseButton}
      closeOnEscape={closeOnEscape}
      closeOnOverlayClick={closeOnOverlayClick}
    >
      <div className="space-y-6">
        {/* O Alert já mostra o ícone do status (os emojis ⚠️/✅/❓ duplicavam a informação). */}
        {hasMessage && (
          <Alert variant={getAlertVariant()}>
            {typeof message === 'string' ? (
              <p className="text-sm leading-relaxed">{message}</p>
            ) : (
              message
            )}
          </Alert>
        )}

        {children}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
    </Modal>
  );
};
