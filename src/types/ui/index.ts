/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// ================================
// INTERFACES PARA ELEMENTOS DOM
// ================================

export type AnchorOptions = {
  href: string;
  download?: string;
  target?: string;
  rel?: string;
  revokeObjectUrl?: boolean;
  objectUrl?: string;
};

export type ScriptOptions = {
  src: string;
  async?: boolean;
  defer?: boolean;
  crossOrigin?: string | null;
};

// ================================
// INTERFACES DE COMPONENTES UI
// ================================

export interface IButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export interface LoadingSpinnerProps {
  className?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
}

export interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export interface FavoriteButtonProps {
  equipmentId: string;
  equipmentName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface GoogleAuthButtonProps {
  onSuccess?: (response: unknown) => void;
  onFailure?: (error: unknown) => void;
}

export interface FacebookAuthButtonProps {
  onSuccess?: (response: unknown) => void;
  onFailure?: (error: unknown) => void;
}

// ================================
// INTERFACES PARA LAYOUT
// ================================

export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  permission?: string;
  badge?: string | number;
  children?: SidebarItem[];
}

export interface SidebarItemComponentProps {
  item: SidebarItem;
  level?: number;
  isActive?: boolean;
  setActiveItem: (id: string) => void;
  activeItem: string;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

// ================================
// INTERFACES PARA MODAIS
// ================================

export interface BaseModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  children?: React.ReactNode;
}

export interface ConfirmModalProps extends BaseModalProps {
  onConfirm?: () => void;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  isLoading?: boolean;
}

export interface AlertModalProps extends BaseModalProps {
  onConfirm?: () => void;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  confirmText?: string;
}

export interface FormModalProps<T = unknown> extends BaseModalProps {
  onSubmit: (data: T) => void;
  isLoading?: boolean;
  submitText?: string;
  cancelText?: string;
}

export interface GalleryImage {
  id?: string;
  url: string;
  title?: string;
  description?: string;
  alt?: string;
}

export interface ImageGalleryModalProps extends BaseModalProps {
  images?: GalleryImage[];
  initialIndex?: number;
  onImageChange?: (index: number) => void;
  showThumbnails?: boolean;
  allowDownload?: boolean;
  allowShare?: boolean;
}

// ================================
// TIPOS PARA LOADING E CONTEXTOS
// ================================

export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';
export type LoadingVariant = 'spinner' | 'dots' | 'bars';

export interface LoadingState {
  isLoading: boolean;
  variant: LoadingVariant;
}

export interface LoadingContextType {
  globalLoading: LoadingState;
  setGlobalLoading: (state: Partial<LoadingState>) => void;
}

// ================================
// TIPOS PARA CONTROLE DE MODAIS
// ================================

export type ModalNames =
  | 'booking'
  | 'equipment'
  | 'kit'
  | 'payment'
  | 'profile'
  | 'contact'
  | 'whatsapp'
  | 'imageGallery'
  | 'filter'
  | 'confirm'
  | 'alert'
  | 'invite';

export type ModalPropsMap = {
    booking: any;
    equipment: any;
    kit: any;
    payment: any;
    profile: any;
    contact: any;
    whatsapp: any;
  imageGallery: ImageGalleryModalProps;
    filter: any;
  confirm: ConfirmModalProps;
  alert: AlertModalProps;
  invite: {
    isOpen?: boolean;
    onClose?: () => void;
    onResend?: () => void;
    inviteUrl?: string;
    tempPassword?: string;
  };
};