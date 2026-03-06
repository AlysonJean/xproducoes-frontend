/* eslint-disable react-refresh/only-export-components */
// packages/web/src/shared/modals/ModalContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import type {
  BookingModalProps,
  EquipmentModalProps,
  KitModalProps,
  PaymentModalProps,
  ProfileModalProps,
  ContactModalProps,
  WhatsAppModalProps,
  ImageGalleryModalProps,
  FilterModalProps,
  ConfirmModalProps,
  AlertModalProps,
  ModalNames,
  ModalPropsMap,
} from '../../types/types';

type ModalContextType = {
  openModal: <T extends ModalNames>(modalName: T, props?: ModalPropsMap[T]) => void;
  closeModal: (modalName: ModalNames) => void;
  closeAllModals: () => void;
  isModalOpen: (modalName: ModalNames) => boolean;
  getModalProps: <T extends ModalNames>(modalName: T) => ModalPropsMap[T] | undefined;
};

type ModalState = {
  [K in ModalNames]?: {
    isOpen: boolean;
    props?: ModalPropsMap[K];
  };
};

const ModalContext = createContext<ModalContextType | null>(null);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [modals, setModals] = useState<ModalState>({});

  const openModal = <T extends ModalNames>(modalName: T, props?: ModalPropsMap[T]) => {
    setModals((prev) => ({
      ...prev,
      [modalName]: {
        isOpen: true,
        props: {
          ...props,
          onClose: () => closeModal(modalName),
        } as ModalPropsMap[T],
      },
    }));
  };

  const closeModal = (modalName: ModalNames) => {
    setModals((prev) => ({
      ...prev,
      [modalName]: {
        isOpen: false,
        props: prev[modalName]?.props as ModalPropsMap[typeof modalName],
      },
    }));
  };

  const closeAllModals = () => {
    setModals((prev) => {
      const newState = { ...prev };
      (Object.keys(newState) as ModalNames[]).forEach((key) => {
        if (newState[key]) {
          newState[key] = {
            ...newState[key]!,
            isOpen: false,
            props: undefined,
          };
        }
      });
      return newState;
    });
  };

  const isModalOpen = (modalName: ModalNames): boolean => {
    return modals[modalName]?.isOpen || false;
  };

  const getModalProps = <T extends ModalNames>(modalName: T): ModalPropsMap[T] | undefined => {
    return modals[modalName]?.props as ModalPropsMap[T] | undefined;
  };

  const value: ModalContextType = {
    openModal,
    closeModal,
    closeAllModals,
    isModalOpen,
    getModalProps,
  };

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
};

// Hooks para modais específicos, agora tipados
export const useBookingModal = () => {
  const { openModal, closeModal, isModalOpen, getModalProps } = useModal();
  return {
    openBookingModal: (props?: BookingModalProps) => openModal('booking', props),
    closeBookingModal: () => closeModal('booking'),
    isBookingModalOpen: isModalOpen('booking'),
    bookingModalProps: getModalProps('booking'),
  };
};

export const useEquipmentModal = () => {
  const { openModal, closeModal, isModalOpen, getModalProps } = useModal();
  return {
    openEquipmentModal: (props?: EquipmentModalProps) => openModal('equipment', props),
    closeEquipmentModal: () => closeModal('equipment'),
    isEquipmentModalOpen: isModalOpen('equipment'),
    equipmentModalProps: getModalProps('equipment'),
  };
};

export const useKitModal = () => {
  const { openModal, closeModal, isModalOpen, getModalProps } = useModal();
  return {
    openKitModal: (props?: KitModalProps) => openModal('kit', props),
    closeKitModal: () => closeModal('kit'),
    isKitModalOpen: isModalOpen('kit'),
    kitModalProps: getModalProps('kit'),
  };
};

export const usePaymentModal = () => {
  const { openModal, closeModal, isModalOpen, getModalProps } = useModal();
  return {
    openPaymentModal: (props?: PaymentModalProps) => openModal('payment', props),
    closePaymentModal: () => closeModal('payment'),
    isPaymentModalOpen: isModalOpen('payment'),
    paymentModalProps: getModalProps('payment'),
  };
};

export const useProfileModal = () => {
  const { openModal, closeModal, isModalOpen, getModalProps } = useModal();
  return {
    openProfileModal: (props?: ProfileModalProps) => openModal('profile', props),
    closeProfileModal: () => closeModal('profile'),
    isProfileModalOpen: isModalOpen('profile'),
    profileModalProps: getModalProps('profile'),
  };
};

// Review modal removido

export const useContactModal = () => {
  const { openModal, closeModal, isModalOpen, getModalProps } = useModal();
  return {
    openContactModal: (props?: ContactModalProps) => openModal('contact', props),
    closeContactModal: () => closeModal('contact'),
    isContactModalOpen: isModalOpen('contact'),
    contactModalProps: getModalProps('contact'),
  };
};

export const useWhatsAppModal = () => {
  const { openModal, closeModal, isModalOpen, getModalProps } = useModal();
  return {
    openWhatsAppModal: (props?: WhatsAppModalProps) => openModal('whatsapp', props),
    closeWhatsAppModal: () => closeModal('whatsapp'),
    isWhatsAppModalOpen: isModalOpen('whatsapp'),
    whatsAppModalProps: getModalProps('whatsapp'),
  };
};

export const useImageGalleryModal = () => {
  const { openModal, closeModal, isModalOpen, getModalProps } = useModal();
  return {
    openImageGalleryModal: (props?: ImageGalleryModalProps) => openModal('imageGallery', props),
    closeImageGalleryModal: () => closeModal('imageGallery'),
    isImageGalleryModalOpen: isModalOpen('imageGallery'),
    imageGalleryModalProps: getModalProps('imageGallery'),
  };
};

export const useFilterModal = () => {
  const { openModal, closeModal, isModalOpen, getModalProps } = useModal();
  return {
    openFilterModal: (props?: FilterModalProps) => openModal('filter', props),
    closeFilterModal: () => closeModal('filter'),
    isFilterModalOpen: isModalOpen('filter'),
    filterModalProps: getModalProps('filter'),
  };
};

export const useConfirmModal = () => {
  const { openModal, closeModal, isModalOpen, getModalProps } = useModal();
  return {
    openConfirmModal: (props?: ConfirmModalProps) => openModal('confirm', props),
    closeConfirmModal: () => closeModal('confirm'),
    isConfirmModalOpen: isModalOpen('confirm'),
    confirmModalProps: getModalProps('confirm'),
  };
};

export const useAlertModal = () => {
  const { openModal, closeModal, isModalOpen, getModalProps } = useModal();
  return {
    openAlertModal: (props?: AlertModalProps) => openModal('alert', props),
    closeAlertModal: () => closeModal('alert'),
    isAlertModalOpen: isModalOpen('alert'),
    alertModalProps: getModalProps('alert'),
  };
};
