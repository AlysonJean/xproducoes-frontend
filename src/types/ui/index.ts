// ================================
// INTERFACES DE COMPONENTES UI
// ================================

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
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
}
