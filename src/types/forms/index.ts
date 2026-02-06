// ================================
// INTERFACES PARA DADOS DE FORMULÁRIOS
// ================================

export interface EquipmentData {
  name?: string;
  description?: string;
  price?: number | string;
  pricePerHour?: number | string;
  category?: string;
  status?: string;
  specifications?: string;
  availability?: boolean | string;
  images?: File[];
}

export interface KitData {
  name?: string;
  description?: string;
  price?: number | string;
  category?: string;
  status?: string;
  equipmentIds?: string[];
  discountPercentage?: number | string;
  availability?: boolean | string;
  images?: File[];
}

export interface BookingData {
  eventDate?: string;
  eventTime?: string;
  eventType?: string;
  duration?: string;
  deliveryAddress?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  additionalRequests?: string;
  [key: string]: unknown;
}

export interface FilterData {
  category?: string;
  priceRange?: { min: number; max: number };
  location?: string;
  availability?: boolean;
  dateRange?: { start: string; end: string };
  status?: string;
  features?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: unknown;
}

export interface ProfileData {
  [key: string]: unknown;
}

export type ContactType = 'general' | 'quote' | 'complaint' | 'partnership' | 'support' | 'other';

export interface ContactData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  urgent: boolean;
  type: ContactType;
  attachments: File[];
}

// ================================
// INTERFACES PARA PROPS DE MODAIS
// ================================

export interface EquipmentModalProps {
  onSubmit?: (data: EquipmentData) => void;
  isLoading?: boolean;
  initialData?: Partial<EquipmentData>;
  isEditing?: boolean;
}

export interface KitModalProps {
  onSubmit?: (data: KitData) => void;
  isLoading?: boolean;
  initialData?: Partial<KitData>;
  isEditing?: boolean;
  availableEquipment?: any[];
}

export interface BookingModalProps {
  onSubmit?: (data: BookingData) => void;
  isLoading?: boolean;
  equipment?: any;
  kit?: any;
  initialData?: Partial<BookingData>;
}

export interface FilterModalProps {
  onApplyFilters?: (filters: FilterData) => void;
  onClearFilters?: () => void;
  initialFilters?: Partial<FilterData>;
  availableCategories?: string[];
  availableLocations?: string[];
  priceRange?: { min: number; max: number };
  filterType?: 'equipment' | 'kit' | 'booking' | 'general';
}

export interface ProfileModalProps {
  onSubmit?: (data: ProfileData) => void;
  isLoading?: boolean;
  initialData?: Partial<ProfileData>;
  userType?: 'client' | 'admin';
}

export interface PaymentModalProps {
  onSubmit?: (data: any) => void;
  isLoading?: boolean;
  bookingId?: string;
  totalAmount?: number;
  paymentMethods?: string[];
  initialData?: Partial<any>;
}

export interface ContactModalProps {
  onSubmit: (data: ContactData) => void;
  isLoading?: boolean;
  initialData?: Partial<ContactData>;
  contactType?: ContactType;
}

export interface WhatsAppModalProps {
  // Props específicas se necessário
}

// ================================
// TIPOS PARA FORMULÁRIOS ESPECIAIS
// ================================

export interface KitFormData {
  name: string;
  description: string;
  price: number;
  equipmentIds: string[];
  image?: File | null;
}

export interface KitCreateData {
  name: string;
  description: string;
  price: number;
  equipmentIds: string[];
}

export interface CustomQuoteFormData {
  venue: string;
  eventDate: string;
  startTime?: string;
  duration: number | string;
  zipCode: string;
  street: string;
  addressNumber: string;
  addressComplement?: string;
  neighborhood: string;
  city: string;
  state: string;
  requiresStairs: 'yes' | 'no';
  isCovered: 'yes' | 'no';
  hasParking: 'yes' | 'no';
  notes?: string;
  name?: string;
  phone?: string;
  email?: string;
}

// ================================
// INTERFACES PARA MENSAGENS E WHATSAPP
// ================================

export type QuoteMessageParams = {
  bookingId?: string;
  user?: { name?: string; phone?: string } | null;
  venue: string;
  eventDate: Date;
  durationHours: number;
  address: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    complement?: string;
  };
  items: Array<{ name?: string } | { equipment?: { name?: string } }>;
  notes?: string;
  logistics: {
    requiresStairs?: boolean;
    isCovered?: boolean;
    hasParking?: boolean;
  };
  locale?: string;
};

// ================================
// INTERFACES PARA COMPONENTES DE FORMULÁRIOS
// ================================

export interface SearchFiltersProps {
  categories: any[];
  onFiltersChange: (filters: {
    searchTerm: string;
    categoryId: string;
    minPrice: string;
    maxPrice: string;
    sortBy: string;
  }) => void;
}

export interface PortfolioCardProps {
  item: any;
}

export interface KitCardProps {
  kit: any;
  showCompare?: boolean;
  showFavorite?: boolean;
  className?: string;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'outline';
  isLoading?: boolean;
}

// ================================
// INTERFACES PARA FILTROS
// ================================

export interface PortfolioFilters {
  searchQuery?: string;
}

export interface KitFilters {
  priceRange?: [number, number];
  searchQuery?: string;
  sortBy?: 'name' | 'price';
  sortOrder?: 'asc' | 'desc';
}

export interface EquipmentFilters {
  category?: string;
  priceRange?: [number, number];
  availability?: boolean;
  tags?: string[];
  searchQuery?: string;
}