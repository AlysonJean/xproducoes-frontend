import React from 'react';
import { Modal } from '../ui/StandardComponents';
import type { BaseModalProps } from '../../types/types';

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  ...props
}) => {
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={!!isOpen}
      onClose={handleClose}
      title={title}
      size={size}
      className={className}
      showCloseButton={showCloseButton}
      closeOnOverlayClick={closeOnOverlayClick}
      closeOnEscape={closeOnEscape}
      {...props}
    >
      {children}
    </Modal>
  );
};
