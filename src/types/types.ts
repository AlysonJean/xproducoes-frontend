// ================================
// ENUMS
// ================================

export interface Banner {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  linkUrl?: string;
  active: boolean;
  sortOrder: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

import { ItemStatus, EquipmentStatus, BookingStatus, PaymentStatus, UserRole, ECollaboratorRole, ExperienceLevel } from './enums';

export { ItemStatus, EquipmentStatus, BookingStatus, PaymentStatus, UserRole, ECollaboratorRole, ExperienceLevel };



// ================================
// INTERFACES PRINCIPAIS
// ================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  bio?: string;
  location?: string;
  phone?: string;
  avatar?: string;
  isActive?: boolean;
  lastLogin?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  totalBookings?: number;
  totalSpent?: number;
  lastLoginAt?: string;
}

export interface Equipment {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  dailyPrice?: number;
  weeklyPrice?: number;
  monthlyPrice?: number;
  price?: number;
  pricePerHour?: number;
  category?: string | Category;
  categoryId?: string;
  images?: string[];
  specifications?: Record<string, unknown>;
  status?: ItemStatus | EquipmentStatus;
  isAvailable?: boolean; // Deprecated
  brand?: string;
  model?: string;
  tags?: string[];
  type?: string;
  addedAt?: Date;
  quantity?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  prevSlug?: string | null;
  nextSlug?: string | null;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  imageAlt?: string;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Service {
  id: string;
  name: string;
  slug?: string;
  description: string;
  price: number;
  duration: number;
  status?: ItemStatus | EquipmentStatus;
  isActive?: boolean;
  imageUrl?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface KitItem {
  id: string;
  kitId: string;
  equipmentId?: string;
  serviceId?: string;
  quantity: number;
  equipment?: Equipment;
  service?: Service;
}

// Níveis de Experiência para Kits
// Níveis de Experiência para Kits




export interface KitExperienceLevel {
  id: string;
  level: ExperienceLevel;
  price: number;
  description?: string;
  includes: string[];
  isPopular?: boolean;
  kitId: string;
}

export interface Kit {
  id: string;
  name: string;
  slug?: string;
  items: KitItem[];
  equipments?: Equipment[]; // Deprecated, kept for compatibility check
  experienceLevels?: KitExperienceLevel[];
  imageUrl?: string;
  description?: string;
  price?: number;
  status?: ItemStatus | EquipmentStatus;
  isActive?: boolean; // Deprecated, kept for compatibility
  createdAt?: Date | string;
  updatedAt?: Date | string;
  prevSlug?: string | null;
  nextSlug?: string | null;
}

export interface Booking {
  id: string;
  startDate?: Date | string;
  endDate?: Date | string;
  eventDate?: string;
  eventEndDate?: string;
  totalAmount?: number;
  totalPrice?: number;
  status?: BookingStatus;
  notes?: string;
  userId?: string;
  user?: User;
  equipmentIds?: string[];
  equipments?: Array<{
    equipmentId: string;
    equipment: Equipment;
  }> | Equipment[];
  kits?: Array<{
    kitId: string;
    kit: Kit;
  }> | Kit[];
  kit?: Kit;
  venue?: string | {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  venueType?: string;
  duration?: number;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  powerAvailable?: boolean;
  urgentRequest?: boolean;
  marketingConsent?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  client?: {
    name?: string;
  };
  deliveryStatus?: string;
  eventTitle?: string;
}

// ================================
// INTERFACES PARA COLABORADORES
// ================================

// Aliases para compatibilidade
export type Collaborator = ICollaborator;
export type EventCollaborator = ICollaborator;

export interface CollaboratorFunction {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CollaboratorAvailability {
  id: string;
  collaboratorId: string;
  date: string;
  isAvailable: boolean;
  timeSlots?: string[];
}

export interface CollaboratorPayment {
  id: string;
  collaboratorId: string;
  eventId: string;
  amount: number;
  status: PaymentStatus;
  dueDate: string;
  paidAt?: string;
}

export interface ICollaborator {
  id: string;
  name: string;
  email?: string;
  role?: ECollaboratorRole;
  hourlyRate?: number;
  averageRating?: number;
  totalEarnings?: number;
  totalEvents?: number;
  status?: 'ACTIVE' | 'INACTIVE';
  avatar?: string;
  user?: {
    email?: string;
  };
  createdAt?: string;
}

export interface EventAssignment {
  id: string;
  collaboratorId: string;
  role: ECollaboratorRole;
  estimatedHours: number;
}

export interface SelectedCollaboratorAssignment {
  collaborator: ICollaborator;
  role: ECollaboratorRole;
  hourlyRate: number;
  estimatedHours: number;
}

export interface CollaboratorDashboard {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
  hourlyRate?: number;
  averageRating?: number;
  totalEarnings?: number;
  totalEvents?: number;
  createdAt: string;
}

// ================================
// INTERFACES PARA DASHBOARD (MOVIDAS PARA domains/dashboard.ts)
// ================================

// DashboardStats, AdminDashboardStats, Event, DashboardEvent, Project, Activity,
// QuickAction, CalendarDay, WorkStats movidos para domains/dashboard.ts

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

export interface PaymentData {
  amount: number;
  method: string;
  installments?: number;
  dueDate: string;
  description?: string;
  bookingId?: string;
  cardDetails?: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    cardholderName: string;
  };
  mbWayPhone?: string;
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

export interface EquipmentModalProps extends BaseModalProps {
  onSubmit?: (data: EquipmentData) => void;
  isLoading?: boolean;
  initialData?: Partial<EquipmentData>;
  isEditing?: boolean;
}

export interface KitModalProps extends BaseModalProps {
  onSubmit?: (data: KitData) => void;
  isLoading?: boolean;
  initialData?: Partial<KitData>;
  isEditing?: boolean;
  availableEquipment?: Equipment[];
}

export interface BookingModalProps extends BaseModalProps {
  onSubmit?: (data: BookingData) => void;
  isLoading?: boolean;
  equipment?: Equipment;
  kit?: Kit;
  initialData?: Partial<BookingData>;
}

export interface FilterModalProps extends BaseModalProps {
  onApplyFilters?: (filters: FilterData) => void;
  onClearFilters?: () => void;
  initialFilters?: Partial<FilterData>;
  availableCategories?: string[];
  availableLocations?: string[];
  priceRange?: { min: number; max: number };
  filterType?: 'equipment' | 'kit' | 'booking' | 'general';
}

export interface ProfileModalProps extends BaseModalProps {
  onSubmit?: (data: ProfileData) => void;
  isLoading?: boolean;
  initialData?: Partial<ProfileData>;
  userType?: 'client' | 'admin';
}

export interface PaymentModalProps extends BaseModalProps {
  onSubmit?: (data: PaymentData) => void;
  isLoading?: boolean;
  bookingId?: string;
  totalAmount?: number;
  paymentMethods?: string[];
  initialData?: Partial<PaymentData>;
}

export interface ContactModalProps extends BaseModalProps {
  onSubmit: (data: ContactData) => void;
  isLoading?: boolean;
  initialData?: Partial<ContactData>;
  contactType?: ContactType;
}

// ReviewModalProps removido

export interface WhatsAppModalProps extends BaseModalProps {
  phoneNumber?: string;
  message?: string;
  subject?: string;
  isLoading?: boolean;
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
// INTERFACES PARA COMPONENTES UI
// ================================
// NOTA: Tipos de UI foram movidos para src/types/ui/index.ts
// Importar de lá: import { IButtonProps, LoadingSpinnerProps } from '@/types/ui'

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
// INTERFACES ESPECIALIZADAS
// ================================

export interface SafeBooking {
  id: string;
  eventDate: string;
  eventTitle?: string;
  status: BookingStatus;
  totalPrice: number;
  equipments: Array<{
    equipmentId: string;
    equipment: Equipment;
  }>;
  kits?: Array<{
    kitId: string;
    kit: Kit;
  }>;
  venue?: {
    street: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  // Presença de avaliação para esta reserva (se existir)
  review?: {
    id: string;
    rating: number;
    reported?: boolean;
    createdAt: string;
  } | null;
}

export interface CalendarBooking {
  id: string;
  eventDate: string;
  eventEndDate?: string;
  eventTitle?: string;
  duration: number;
  status: BookingStatus;
  client?: { name?: string; phone?: string };
  venue?: { street?: string; city?: string; postalCode?: string };
  equipments?: Equipment[];
  kits?: Kit[];
  collaborators?: Array<{
    collaboratorId?: string;
    collaborator?: ICollaborator & { avatar?: string };
    role?: string;
  }>;
  internalNotes?: string;
  serviceValue?: number;
  totalPrice?: number;
}

export interface BookingDetails {
  id: string;
  eventDate: string;
  eventEndDate?: string;
  client?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
    user?: {
      id?: string;
      name?: string;
      email?: string;
      avatarUrl?: string;
    };
  };
  clientName?: string;
  clientContact?: string;
  clientEmail?: string;
  status?: string;
  deliveryStatus?: string;
  kit?: Kit;
  kits?: Array<{
    id?: string;
    name?: string;
    kit?: Kit;
  }> | Kit[];
  equipments?: Equipment[];
  services?: Service[];
  totalPrice?: number;
  serviceValue?: number;
  paymentProofUrl?: string;
  eventLocation?: string;
  location?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  addressNumber?: string;
  addressComplement?: string;
  requiresStairs?: boolean;
  isCovered?: boolean;
  hasParking?: boolean;
  notes?: string;
  internalNotes?: string;
  specialRequests?: string;
  eventDuration?: number;
  setupTime?: string;
  pickupTime?: string;
  createdAt?: string;
  updatedAt?: string;
  eventCollaborators?: Array<{
    id?: string;
    collaboratorId?: string;
    role?: string;
    startTime?: string;
    endTime?: string;
    hourlyRate?: number;
    fixedRate?: number;
    totalHours?: number;
    totalPayment?: number;
    status?: string;
    notes?: string;
    collaborator?: {
      id?: string;
      name?: string;
      phone?: string;
      avatar?: string;
      user?: {
        id?: string;
        name?: string;
        email?: string;
        avatarUrl?: string;
      };
    };
  }>;
  attachments?: Array<{
    id: string;
    url: string;
    filename?: string;
    mimeType?: string;
    createdAt?: string;
  }>;
}

export interface BookingListItem {
  id: string;
  client: {
    id: string;
    phone?: string;
    companyName?: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
    };
  };
  status: string;
  deliveryStatus?: string;
  totalPrice: string; // Note: API returns as string
  eventDate: string;
  eventTitle?: string;
  eventEndDate?: string;
  location?: string;
  notes?: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  message: string;
  status: 'PENDING' | 'READ';
  createdAt: string;
}

export interface QuoteRequest {
  eventType: string;
  eventDate: string;
  location: string;
  guestCount: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  description?: string;
  budget?: string;
  equipmentIds?: string[];
  kitIds?: string[];
}

export interface AdditionalCost {
  id: string;
  name: string;
  cost: number;
  description?: string;
  category?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Review {
  id?: string;
  author: string;
  rating: number;
  comment: string;
  slug?: string;
  user?: {
    name?: string;
  };
}

export type MediaType = 'IMAGE' | 'VIDEO';

export interface PortfolioMedia {
  id: string;
  portfolioId: string;
  url: string;
  type: MediaType;
  filename?: string;
  mimeType?: string;
  isCover: boolean;
  sortOrder: number;
}

export interface PortfolioItem {
  id: string;
  title: string;
  slug?: string;
  imageUrl: string;
  description: string;
  eventDate?: string;
  media?: PortfolioMedia[];
  sortOrder?: number;
}

// ================================
// INTERFACES PARA PROPS DE COMPONENTES
// ================================

// TestimonialCardProps removido

export interface SearchFiltersProps {
  categories: Category[];
  onFiltersChange: (filters: {
    searchTerm: string;
    categoryId: string;
    minPrice: string;
    maxPrice: string;
    sortBy: string;
  }) => void;
}

export interface PortfolioCardProps {
  item: PortfolioItem;
}

export interface KitCardProps {
  kit: Kit;
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
// TIPOS PARA PAGINAÇÃO
// ================================

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface ClientResponse {
  data: User[];
  meta: PaginationMeta;
}

// ================================
// TIPOS PARA HTTP CLIENT
// ================================

export interface HttpRequestConfig {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface HttpClient {
  get<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
  post<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
  put<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
  patch<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
  delete<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
}

// ================================
// TIPOS PARA SERVICE WORKER E PWA
// ================================

export interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

export interface ServiceWorkerActions {
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  update: () => Promise<void>;
  sendMessage: (message: unknown) => void;
}
export interface PerformanceMetrics {
  type: 'PERFORMANCE_METRICS';
  metrics: {
    dns: number;
    tcp: number;
    request: number;
    response: number;
    dom: number;
    load: number;
    total: number;
  };
  timestamp: number;
}

export interface PWAInstallHook {
  isInstallable: boolean;
  promptInstall: () => Promise<void>;
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
  booking: BookingModalProps;
  equipment: EquipmentModalProps;
  kit: KitModalProps;
  payment: PaymentModalProps;
  profile: ProfileModalProps;
  contact: ContactModalProps;
  whatsapp: WhatsAppModalProps;
  imageGallery: ImageGalleryModalProps;
  filter: FilterModalProps;
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

// ================================
// TIPOS AUXILIARES
// ================================

export type FavoriteItem = {
  id: string | number;
  type: 'equipment' | 'kit';
};

export interface GeminiSuggestionResponse {
  suggestion: string;
}

export interface DiagnosticResult {
  status: string;
  timestamp: string;
  services: {
    database: { status: string; message: string };
    auth: { status: string; message: string };
    system: { status: string; message: string };
  };
}

// ================================
// TIPOS PARA VALIDATORS (ZOD SCHEMAS)
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

// ================================
// TIPOS PARA UTILS
// ================================

export interface FormatOptions {
  showCurrency?: boolean;
  decimals?: number;
}

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  timestamp: string;
}

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
// TIPOS PARA FILTROS DE PÁGINAS
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

// ================================
// TIPOS PARA PERFIS E CONFIGURAÇÕES
// ================================

export interface ClientProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  companyName?: string;
  jobTitle?: string;
  industry?: string;
  verified: boolean;
  createdAt: string;
  totalBookings: number;
  totalSpent: number;
  averageRating?: number;
  isVip?: boolean;
  memberSince: string;
}

export interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  bio: string;
  location: string;
  website: string;
  companyName: string;
  jobTitle: string;
  industry: string;
}

export interface ProfileSettings {
  name: string;
  email: string;
  phone: string;
  bio: string;
  specialties: string[];
  profileImage: string;
  location: string;
  website: string;
}

export interface SecuritySettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  twoFactorEnabled: boolean;
  loginNotifications: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'clients_only';
  showEmail: boolean;
  showPhone: boolean;
  allowReviews: boolean;
  allowMessages: boolean;
}

export interface PaymentSettings {
  pixKey: string;
  bankAccount: {
    bank: string;
    agency: string;
    account: string;
    accountType: 'corrente' | 'poupanca';
  };
  preferredMethod: 'pix' | 'bank_transfer' | 'both';
}

// ================================
// TIPOS PARA DASHBOARD E FORMULÁRIOS
// ================================

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: 'primary' | 'success' | 'warning' | 'info';
  badge?: string;
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
// TIPOS PARA CALENDÁRIO E AGENDA
// ================================

export interface CalendarDay {
  date: Date;
  bookings: Booking[];
  isCurrentMonth: boolean;
  hasWork: boolean;
  isToday: boolean;
}

export interface WorkStats {
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  workingDays: number;
  totalRevenue: number;
  averageRating: number;
}

// ================================
// TIPOS PARA NOTIFICAÇÕES
// ================================

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  bookingReminders: boolean;
  paymentNotifications: boolean;
  marketingEmails: boolean;
}

// ================================
// TIPOS PARA RELATÓRIOS
// ================================

export interface ReportData {
  // Propriedades específicas para relatórios de colaboradores
  performance?: {
    eventsCompleted: number;
    completionRate: number;
    averageRating: number;
    onTimeDelivery: number;
  };
  monthly?: Array<{
    month: string;
    events: number;
    rating: number;
    earnings: number;
  }>;
  eventTypes?: Array<{
    type: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  timeAnalysis?: {
    mostProductiveHour: string;
    averageEventDuration: string;
    workingDaysPerMonth: number;
  };
}

// ================================
// TIPOS PARA DISPONIBILIDADE
// ================================

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  bookingId?: string;
}

export interface SpecialDate {
  id: string;
  date: string;
  type: 'holiday' | 'vacation' | 'unavailable' | 'special';
  title: string;
  description?: string;
}

export interface AvailabilityData {
  collaboratorId: string;
  weeklySchedule: {
    monday: TimeSlot[];
    tuesday: TimeSlot[];
    wednesday: TimeSlot[];
    thursday: TimeSlot[];
    friday: TimeSlot[];
    saturday: TimeSlot[];
    sunday: TimeSlot[];
  };
  specialDates: SpecialDate[];
  timezone: string;
}

// ================================
// TIPOS PARA GANHOS
// ================================

export interface EarningsData {
  totalEarnings: number;
  monthlyEarnings: Array<{
    month: string;
    earnings: number;
    events: number;
  }>;
  pendingPayments: number;
  averageHourlyRate: number;
  totalHoursWorked: number;
  paymentHistory: Array<{
    id: string;
    amount: number;
    date: string;
    eventTitle: string;
    status: 'paid' | 'pending' | 'cancelled';
  }>;
}

// ================================
// TIPOS DIVERSOS
// ================================

export interface AdminReview {
  id: string;
  bookingId: string;
  clientId: string;
  clientName: string;
  rating: number;
  comment: string;
  createdAt: string;
  reported: boolean;
  reportReason?: string;
}

export interface CalendarEvent extends Event {
  bookingId?: string;
  clientName?: string;
  equipmentCount?: number;
  totalValue?: number;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole[];
  redirectTo?: string;
}
