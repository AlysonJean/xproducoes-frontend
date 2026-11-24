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
  /** Onda 4 da auditoria de 19/11 (F5-12): para onde ir depois de entrar (o "next" do login); sem ele, o que o servidor mandar. */
  redirectTo?: string;
}
