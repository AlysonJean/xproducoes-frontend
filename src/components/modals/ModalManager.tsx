// src/components/modals/ModalManager.tsx
import React from 'react';
import { useModal } from './ModalContext';
import {
  WhatsAppModal,
  ImageGalleryModal,
  ConfirmModal,
  AlertModal,
} from './index';
import { InviteModal } from './InviteModal';

export const ModalManager: React.FC = () => {
  const { isModalOpen, getModalProps } = useModal();

  return (
    <>
      {/* WhatsApp Modal */}
      {isModalOpen('whatsapp') && <WhatsAppModal isOpen={true} {...getModalProps('whatsapp')} />}

      {/* Image Gallery Modal */}
      {isModalOpen('imageGallery') && (
        <ImageGalleryModal isOpen={true} {...getModalProps('imageGallery')} />
      )}

      {/* Confirm Modal */}
      {isModalOpen('confirm') && <ConfirmModal isOpen={true} {...getModalProps('confirm')} />}

      {/* Alert Modal */}
      {isModalOpen('alert') && <AlertModal isOpen={true} {...getModalProps('alert')} />}
  {isModalOpen('invite') && <InviteModal isOpen={true} {...getModalProps('invite')} />}
    </>
  );
};
