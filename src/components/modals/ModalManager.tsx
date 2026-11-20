// src/components/modals/ModalManager.tsx
import React from 'react';
import { useModal } from './ModalContext';
import {
  WhatsAppModal,
  ImageGalleryModal,
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

  {isModalOpen('invite') && <InviteModal isOpen={true} {...getModalProps('invite')} />}
    </>
  );
};
