
import type { BookingContractSummary } from './contract';

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

import { ItemStatus, EquipmentStatus, BookingStatus, BookingPaymentStatus, PaymentStatus, UserRole, ECollaboratorRole, ExperienceLevel } from './enums';
import type { BookingItemLike, BookingPricing, KitFulfillment } from '../utils/bookingPricing';

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

export interface Client {
  id: string;
  userId?: string;
  name: string;
  email: string;
  role?: string;
  bio?: string;
  location?: string;
  phone?: string;
  avatar?: string;
  isActive?: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  totalBookings: number;
  totalSpent: number;
  companyName?: string;
  industry?: string;
  companySize?: string;
  // Onda 4 da auditoria de 19/11 (F2-05): sem taxId (a API nunca manda o documento do cliente).
  isVip?: boolean;
  /** D8c: data do pedido de exclusão adiado (reserva futura ou pagamento pendente); null sem pedido. */
  deletionScheduledAt?: string | null;
    address?: unknown;
  jobTitle?: string;
  department?: string;
  budget?: number;
  preferredCategories?: string[];
  eventTypes?: string[];
    communicationPrefs?: unknown;
  user?: User;
}

export interface Equipment {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  pricePerHour?: number;
  /** Diária (lote 13): unidade do preço de pricePerHour, que o servidor põe nas respostas públicas (EQUIPMENT_PRICE_UNIT). */
  priceUnit?: 'hour' | 'day';
  /** Mínimo de unidades do cadastro; na diária, o mínimo de diárias que o servidor cobra. */
  minimumRentalDuration?: number;
  hourlyRate?: number;
  discount?: number;
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
  /** Lote 13: "Pode acompanhar o evento todo" (cobra pelas horas do evento; ver serviceLine em utils/bookingPricing). */
  coversWholeEvent?: boolean;
  hourlyRate?: number;
  discount?: number;
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




interface KitExperienceLevel {
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
  /** Fotos extras do kit (Kit.images no backend). */
  images?: string[];
  description?: string;
  price?: number;
  hourlyRate?: number;
  discount?: number;
  // Lote 13 (aprovado pelo dono em 06/11/2026): horas incluídas no preço, valor da hora extra (o Decimal chega
  // como texto da API; transformKit converte) e o tipo do kit.
  minimumRentalDuration?: number | null;
  extraHourPrice?: number | string | null;
  fulfillment?: KitFulfillment;
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
  discount?: number;
  status?: BookingStatus;
  paymentStatus?: BookingPaymentStatus | null;
  // Onda 2b da auditoria do status (D8): o reembolso registrado (valor devolvido e dia).
  refundAmount?: number | string | null;
  refundedAt?: string | null;
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

export interface CollaboratorFunction {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
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
  /** D3: null quando o colaborador não tem valor por hora definido (a escala não inventa R$ 50). */
  hourlyRate: number | null;
}

export interface SelectedCollaboratorAssignment {
  collaborator: ICollaborator;
  /** D3: começa com a função do próprio colaborador; vazia, precisa ser escolhida antes de salvar. */
  role: ECollaboratorRole | '';
  /** D3: começa com o valor por hora do colaborador; vazio quando ele não tem. */
  hourlyRate: number | '';
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
  /** D3: conta do colaborador (GET /collaborators). verified false = ainda não criou a senha pelo link;
   * role e isActive dizem se o servidor aceita o reenvio do link (só conta de colaborador, ativa). */
  user?: { verified?: boolean; role?: string; isActive?: boolean };
}

// ================================
// INTERFACES PARA DASHBOARD (MOVIDAS PARA domains/dashboard.ts)
// ================================

// DashboardStats, AdminDashboardStats, Event, DashboardEvent, Activity,
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

// ================================
// INTERFACES PARA PROPS DE MODAIS
// ================================

export interface WhatsAppModalProps extends BaseModalProps {
  phoneNumber?: string;
  message?: string;
  subject?: string;
  isLoading?: boolean;
}

interface GalleryImage {
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
// INTERFACES ESPECIALIZADAS
// ================================

export interface SafeBooking {
  id: string;
  eventDate: string;
  eventTitle?: string;
  status: BookingStatus;
  totalPrice: number;
  // Auditoria completa (19/11/2026): o GET /bookings/user manda os equipamentos já como objetos do catálogo (com name),
  // o kit em `kit` e o endereço nos campos da reserva; a forma antiga (equipment, kits, venue) segue aceita. As telas
  // leem pelos utilitários de utils/clientBookingItems.
  equipments: Array<{
    id?: string;
    name?: string | null;
    equipmentId?: string;
    equipment?: Equipment;
  }>;
  kit?: { id?: string; name?: string | null } | null;
  kits?: Array<{
    kitId: string;
    kit: Kit;
  }>;
  street?: string | null;
  addressNumber?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
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
  // D11: quando a equipe enviou a proposta ("Enviar proposta" da ficha); null sem envio.
  proposal?: { sentAt: string | null } | null;
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
  // Só admin recebe a agenda: observação interna e a observação que o cliente vê (reservas antigas
  // guardavam a interna em notes).
  internalNotes?: string | null;
  notes?: string | null;
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
    companyName?: string;
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
  paymentStatus?: string;
  // Onda 2b da auditoria do status (D8): o reembolso registrado (valor devolvido e dia).
  refundAmount?: number | string | null;
  refundedAt?: string | null;
  // D21: sem url. O arquivo é privado e abre por um link de 5 minutos (utils/bookingAttachments).
  attachments?: Array<{
    id?: string;
    filename?: string;
    mimeType?: string;
    createdAt?: string;
  }>;
  kit?: Kit;
  kits?: Array<{
    id?: string;
    name?: string;
    kit?: Kit;
    items?: KitItem[];
  }> | Kit[];
  equipments?: Equipment[];
  services?: Service[];
  totalPrice?: number | string;
  discount?: number;
  // D8a e P16: o valor final é só o totalPrice. Itens da proposta como gravados (técnico, montagem e frete
  // entram como itens) e o resumo de preço que a ficha (GET /bookings/:id) traz.
  items?: BookingItemLike[];
  pricing?: BookingPricing | null;
  // D11: quando a equipe enviou a proposta ("Enviar proposta" da ficha); null sem envio.
  proposal?: { sentAt: string | null } | null;
  // Aceite online (13/11/2026): estado do contrato aceito pelo site; null sem contrato (ou com o aceite desligado).
  contractSummary?: BookingContractSummary | null;
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
    discount?: number;
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
    payments?: unknown[];
  }>;
  eventTitle?: string;
  couponId?: string;
  discountAmount?: number | string;
  coupon?: {
    id?: string;
    code?: string;
    discountType?: 'PERCENTAGE' | 'FIXED';
    discountValue?: number | string;
  };
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
  totalPrice: string;
  eventDate: string;
  eventTitle?: string;
  eventEndDate?: string;
  location?: string;
  notes?: string;
  clientName?: string; // Reservas manuais sem cliente cadastrado
  clientContact?: string | null; // Contato informado na reserva (o WhatsApp da lista usa antes do cadastro)
  paymentStatus?: BookingPaymentStatus | null;
  // P3: filtros do painel na lista de Reservas (origem=cliente, ordem=antigos, proposta=nao-enviada).
  createdAt?: string;
  creator?: { role: string } | null; // só o papel de quem criou (CLIENT = pedido de cliente)
  proposalSent?: boolean; // já houve "Enviar proposta" (D11)
  fromHistory?: boolean; // onda 3 (M10): reserva do histórico importado (fora do "a receber")
  // Onda 2 da auditoria do status (C5): o contrato aceito pelo site (quando e até quando a parcela inicial vence).
  acceptedContract?: { acceptedAt: string | null; initialPaymentDueAt: string | null } | null;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  message: string;
  isRead: boolean; // modelo Contact do backend (GET /admin/contacts): não existe "status"
  createdAt: string;
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

type MediaType = 'IMAGE' | 'VIDEO';

interface PortfolioMedia {
  id: string;
  portfolioId: string;
  url: string;
  type: MediaType;
  filename?: string;
  mimeType?: string;
  isCover: boolean;
  sortOrder: number;
  /**
   * Pedido do dono de 09/11/2026 (Instagram): preenchido só em projetos criados de uma publicação do Instagram. Com
   * ele, a mídia é um vídeo do Instagram: `url` é a capa (imagem) e `embedUrl` é o endereço da publicação, que o site
   * abre no player do Instagram depois do clique. Nas mídias antigas vem null.
   */
  embedUrl?: string | null;
}

export interface PortfolioItem {
  id: string;
  title: string;
  slug?: string;
  imageUrl: string;
  description: string;
  eventDate?: string | Date;
  media?: PortfolioMedia[];
  sortOrder?: number;
  isPinned?: boolean;
}

// ================================
// INTERFACES PARA PROPS DE COMPONENTES
// ================================

// TestimonialCardProps removido

export interface PortfolioCardProps {
  item: PortfolioItem;
}

// ================================
// TIPOS PARA CONTROLE DE MODAIS
// ================================

export type ModalNames =
  | 'whatsapp'
  | 'imageGallery'
  | 'invite';

export type ModalPropsMap = {
  whatsapp: WhatsAppModalProps;
  imageGallery: ImageGalleryModalProps;
  invite: {
  isOpen?: boolean;
    onClose?: () => void;
    onResend?: () => void;
    inviteUrl?: string;
    tempPassword?: string;
    /** D3: aviso na janela, junto do link (ex.: o e-mail com o link não saiu). */
    notice?: string;
  };
};

// ================================
// TIPOS PARA UTILS
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
  preferences?: {
    notifications?: ProfileNotificationPreferences;
    general?: ProfileGeneralPreferences;
  };
  googleCalendarEmail?: string | null;
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

export interface ProfilePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Só as chaves que a aba Notificações mostra e o servidor consulta (services/notificationPreferences.ts).
export interface ProfileNotificationPreferences {
  bookingUpdatesEmail: boolean;
  bookingUpdatesPush: boolean;
}

export interface ProfileGeneralPreferences {
  language: string;
  timezone: string;
  currency: string;
  profileType: 'individual' | 'business';
  defaultDeliveryMethod: 'delivery' | 'pickup';
  autoInvoice: boolean;
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
// TIPOS PARA RELATÓRIOS
// ================================

export interface ReportData {
  // Propriedades específicas para relatórios de colaboradores
  performance?: {
    eventsCompleted: number;
    completionRate: number;
    averageRating: number;
  };
  monthly?: Array<{
    month: string;
    events: number;
    rating: number;
    earnings: number;
  }>;
  timeAnalysis?: {
    mostProductiveHour: string;
    averageEventDuration: string;
    workingDaysPerMonth: number;
  };
}
