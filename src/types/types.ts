// ================================
// ENUMS
// ================================

export enum UserRole {
  CLIENT = 'CLIENT',
  ADMIN = 'ADMIN',
  COLLABORATOR = 'COLLABORATOR',
  FREELANCER = 'FREELANCER'
}

export enum BookingStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

export enum EquipmentStatus {
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
  MAINTENANCE = 'MAINTENANCE',
  UNAVAILABLE = 'UNAVAILABLE'
}

export enum ECollaboratorRole {
  PHOTOGRAPHER = 'PHOTOGRAPHER',
  ASSISTANT = 'ASSISTANT',
  PRODUCER = 'PRODUCER',
  OTHER = 'OTHER',
}

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
  description?: string;
  dailyPrice?: number;
  weeklyPrice?: number;
  monthlyPrice?: number;
  price?: number;
  pricePerHour?: number;
  status?: EquipmentStatus;
  specifications?: Record<string, any>;
  images?: string[];
  image?: string;
  imageUrl?: string;
  categoryId?: string;
  category?: string;
  isAvailable?: boolean;
  brand?: string;
  model?: string;
  tags?: string[];
  type?: string;
  addedAt?: Date;
  quantity?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Kit {
  id: string;
  name: string;
  equipments: Equipment[];
  imageUrl?: string;
  description?: string;
  price?: number;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
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
// INTERFACES PARA DASHBOARD
// ================================

export interface DashboardStats {
  totalEvents?: number;
  totalProjects?: number;
  totalBookings?: number;
  totalRevenue?: number;
  totalEarnings?: number;
  averageRating?: number;
  completionRate?: number;
  activeUsers?: number;
  pendingPayments?: number;
}

export interface AdminDashboardStats {
  totalRevenue: number;
  revenueGrowth: number;
  newBookingsThisMonth: number;
  bookingsGrowth: number;
  totalClients: number;
  pendingBookings: number;
  completedBookings: number;
  conversionRate: number;
  // Propriedades opcionais para compatibilidade
  totalBookings?: number;
  activeCollaborators?: number;
  confirmedBookings?: number;
  totalEquipments?: number;
  topCollaborators?: Array<{
    collaborator: {
      id: string;
      name: string;
      role?: string;
    };
    rating: number;
    eventCount: number;
  }>;
}

export interface Event {
  id: string;
  title: string;
  startTime: string | Date;
  endTime?: string | Date;
  startDate?: string;
  endDate?: string;
  location?: string;
  totalPayment?: number;
  status?: 'CONFIRMED' | 'ASSIGNED' | 'PENDING' | 'CANCELLED';
  description?: string;
}

export interface DashboardEvent extends Event {
  // Extensão específica para dashboard
}

export interface Project {
  id?: string;
  title?: string;
  deadline: string | Date;
  payment?: number;
  status?: 'IN_PROGRESS' | 'COMPLETED' | 'PENDING' | 'CANCELLED';
  description?: string;
  clientName?: string;
}

export interface Activity {
  id: string;
  type: string;
  title?: string;
  description: string;
  amount?: number;
  status?: string;
  timestamp: Date | string;
  createdAt?: string;
  user?: {
    id: string;
    name: string;
  };
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
  // Props específicas se necessário
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

import type { ButtonHTMLAttributes, ReactNode } from 'react';

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
}

export interface BookingDetails {
  id: string;
  eventDate: string;
  eventEndDate?: string;
  client?: { name?: string; phone?: string; email?: string };
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
  totalPrice?: number;
  serviceValue?: number;
  paymentProofUrl?: string;
  eventCollaborators?: Array<{
    id?: string;
    role?: string;
    totalHours?: number;
    totalPayment?: number;
    collaboratorId?: string;
    collaborator?: ICollaborator & { avatar?: string; user?: { id?: string; name?: string; avatarUrl?: string } };
    payments?: CollaboratorPayment[];
  }>;
  attachments?: Array<{
    id?: string;
    url?: string;
    filename?: string;
    mimeType?: string;
    createdAt?: string;
  }>;
  location?: string;
  eventLocation?: string;
  notes?: string;
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
  user?: {
    name?: string;
  };
}

export interface PortfolioItem {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
  images?: string[];
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

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
  prompt(): Promise<void>;
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
