// packages/web/src/shared/modals/AlertModal.tsx
import React from 'react';
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertModalProps } from '../../types/types';
import type { StandardVariant } from '../ui/StandardTypes';

// Achado (auditoria do design system): o tipo "error" usava `bg-danger`/`text-danger` e a mensagem
// `text-tertiary` — classes que não existem (ícone sem cor, texto sem cor definida); o tipo "info"
// pintava o ícone com `text-accent`, que no tema claro é um azul quase branco (ícone invisível).
// Agora cada tipo usa o próprio token de status, e o botão usa a variante correspondente.
const typeStyles: Record<
  'info' | 'success' | 'warning' | 'error',
  { iconWrapper: string; defaultTitle: string; button: StandardVariant; Icon: typeof Info }
> = {
  info: { iconWrapper: 'bg-info/10 text-info', defaultTitle: 'Informação', button: 'info', Icon: Info },
  success: { iconWrapper: 'bg-success/10 text-success', defaultTitle: 'Sucesso', button: 'success', Icon: CheckCircle2 },
  warning: { iconWrapper: 'bg-warning/10 text-warning', defaultTitle: 'Atenção', button: 'warning', Icon: AlertTriangle },
  error: { iconWrapper: 'bg-destructive/10 text-destructive', defaultTitle: 'Erro', button: 'destructive', Icon: AlertCircle },
};

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
  closeOnEscape = true,
  closeOnOverlayClick = true,
}) => {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else if (onClose) {
      onClose();
    }
  };

  const currentType = typeStyles[type ?? 'info'] ?? typeStyles.info;
  const { Icon } = currentType;

  return (
    <Modal
      isOpen={!!isOpen}
      onClose={() => onClose?.()}
      title={title || currentType.defaultTitle}
      className={className}
      size={size}
      showCloseButton={false}
      closeOnEscape={closeOnEscape}
      closeOnOverlayClick={closeOnOverlayClick}
    >
      <div className="sm:flex sm:items-start">
        <div
          className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${currentType.iconWrapper} sm:mx-0 sm:h-10 sm:w-10`}
        >
          <Icon className="w-6 h-6" aria-hidden="true" />
        </div>
        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
          <p className="mt-2 text-sm text-foreground">{message}</p>
        </div>
      </div>

      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <Button
          type="button"
          variant={currentType.button}
          onClick={handleConfirm}
          fullWidth
          className="sm:ml-3 sm:w-auto"
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};
