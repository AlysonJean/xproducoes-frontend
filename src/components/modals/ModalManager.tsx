// src/components/modals/ModalManager.tsx
import React from 'react';
import { useModal } from './ModalContext';
import {
  BookingModal,
  EquipmentModal,
  KitModal,
  PaymentModal,
  ProfileModal,
  ContactModal,
  WhatsAppModal,
  ImageGalleryModal,
  FilterModal,
  ConfirmModal,
  AlertModal,
} from './index';
import { InviteModal } from './InviteModal';

export const ModalManager: React.FC = () => {
  const { isModalOpen, getModalProps } = useModal();

  return (
    <>
      {/* Booking Modal */}
      {isModalOpen('booking') && <BookingModal isOpen={true} {...getModalProps('booking')} />}

      {/* Equipment Modal */}
      {isModalOpen('equipment') && <EquipmentModal isOpen={true} {...getModalProps('equipment')} />}

      {/* Kit Modal */}
      {isModalOpen('kit') && <KitModal isOpen={true} {...getModalProps('kit')} />}

      {/* Payment Modal */}
      {isModalOpen('payment') && <PaymentModal isOpen={true} {...getModalProps('payment')} />}

      {/* Profile Modal */}
      {isModalOpen('profile') && <ProfileModal isOpen={true} {...getModalProps('profile')} />}

  {/* Review Modal removido */}

      {/* Contact Modal */}
      {isModalOpen('contact') &&
        (() => {
          const contactProps = getModalProps('contact') || {};
          type ContactSubmit = { onSubmit?: (data: unknown) => void };
          const onSubmit = (contactProps as ContactSubmit).onSubmit ?? (() => {});
          return <ContactModal isOpen={true} onSubmit={onSubmit} {...contactProps} />;
        })()}

      {/* WhatsApp Modal */}
      {isModalOpen('whatsapp') && <WhatsAppModal isOpen={true} {...getModalProps('whatsapp')} />}

      {/* Image Gallery Modal */}
      {isModalOpen('imageGallery') && (
        <ImageGalleryModal isOpen={true} {...getModalProps('imageGallery')} />
      )}

      {/* Filter Modal */}
      {isModalOpen('filter') && <FilterModal isOpen={true} {...getModalProps('filter')} />}

      {/* Confirm Modal */}
      {isModalOpen('confirm') && <ConfirmModal isOpen={true} {...getModalProps('confirm')} />}

      {/* Alert Modal */}
      {isModalOpen('alert') && <AlertModal isOpen={true} {...getModalProps('alert')} />}
  {isModalOpen('invite') && <InviteModal isOpen={true} {...getModalProps('invite')} />}
    </>
  );
};
