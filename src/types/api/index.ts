// ================================
// INTERFACES PARA REQUESTS E RESPONSES DA API
// ================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
  timestamp?: string;
  path?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: any;
}

// ================================
// INTERFACES PARA AUTENTICAÇÃO
// ================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  userType?: 'client' | 'admin';
}

export interface AuthResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any;
  token: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

// ================================
// INTERFACES PARA EQUIPAMENTOS
// ================================

export interface EquipmentCreateRequest {
  name: string;
  description: string;
  price: number;
  pricePerHour: number;
  categoryId: string;
  specifications: string;
  availability: boolean;
  images?: File[];
}

export interface EquipmentUpdateRequest extends Partial<EquipmentCreateRequest> {
  id: string;
}

export interface EquipmentSearchRequest {
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  availability?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ================================
// INTERFACES PARA RESERVAS
// ================================

export interface BookingCreateRequest {
  equipmentId?: string;
  kitId?: string;
  eventDate: string;
  eventTime: string;
  eventType: string;
  duration: number;
  deliveryAddress: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  additionalRequests?: string;
  paymentMethod?: string;
}

export interface BookingUpdateRequest extends Partial<BookingCreateRequest> {
  id: string;
  status?: string;
}

export interface BookingSearchRequest {
  status?: string;
  startDate?: string;
  endDate?: string;
  clientName?: string;
  equipmentId?: string;
  page?: number;
  limit?: number;
}

// ================================
// INTERFACES PARA KITS
// ================================

export interface KitCreateRequest {
  name: string;
  description: string;
  price: number;
  equipmentIds: string[];
  discountPercentage?: number;
  availability: boolean;
  images?: File[];
}

export interface KitUpdateRequest extends Partial<KitCreateRequest> {
  id: string;
}

export interface KitSearchRequest {
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  availability?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ================================
// INTERFACES PARA CONTATO
// ================================

export interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  urgent: boolean;
  type: 'general' | 'quote' | 'complaint' | 'partnership' | 'support' | 'other';
  attachments?: File[];
}

// ================================
// INTERFACES PARA DASHBOARD
// ================================

export interface DashboardStatsRequest {
  startDate?: string;
  endDate?: string;
}

export interface DashboardStatsResponse {
  totalBookings: number;
  totalRevenue: number;
  totalEquipment: number;
  activeBookings: number;
  monthlyRevenue: number[];
  bookingStatusDistribution: Record<string, number>;
  popularEquipment: Array<{
    id: string;
    name: string;
    bookingsCount: number;
  }>;
}

// ================================
// INTERFACES PARA UPLOAD
// ================================

export interface UploadRequest {
  file: File;
  folder?: string;
  publicId?: string;
}

export interface UploadResponse {
  url: string;
  publicId: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
}

export interface MultipleUploadRequest {
  files: File[];
  folder?: string;
}

export interface MultipleUploadResponse {
  uploads: UploadResponse[];
}

// ================================
// INTERFACES PARA NOTIFICAÇÕES
// ================================

export interface NotificationRequest {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  userId?: string;
  broadcast?: boolean;
}

export interface NotificationResponse {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  userId?: string;
}

// ================================
// INTERFACES PARA RELATÓRIOS
// ================================

export interface ReportRequest {
  type: 'bookings' | 'revenue' | 'equipment' | 'clients';
  startDate: string;
  endDate: string;
  format?: 'json' | 'csv' | 'pdf';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters?: Record<string, any>;
}

export interface ReportResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  generatedAt: string;
  period: {
    startDate: string;
    endDate: string;
  };
}

// ================================
// INTERFACES PARA CONFIGURAÇÕES
// ================================

export interface SettingsUpdateRequest {
  key: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  category?: string;
}

export interface SettingsResponse {
  id: string;
  key: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  category: string;
  updatedAt: string;
}

// ================================
// INTERFACES PARA WEBHOOKS
// ================================

export interface WebhookRequest {
  event: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  timestamp: string;
  signature?: string;
}

export interface WebhookResponse {
  success: boolean;
  message?: string;
  processed?: boolean;
}

// ================================
// INTERFACES PARA PAGAMENTO
// ================================

export interface PaymentRequest {
  bookingId: string;
  amount: number;
  method: string;
  installments?: number;
  cardToken?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  id: string;
  status: string;
  amount: number;
  method: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

// ================================
// INTERFACES PARA LOGS E AUDITORIA
// ================================

export interface LogRequest {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

export interface AuditLogResponse {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  changes: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

// ================================
// INTERFACES PARA MONITORAMENTO
// ================================

export interface HealthCheckResponse {
  status: 'ok' | 'warning' | 'error';
  timestamp: string;
  services: Record<string, {
    status: 'up' | 'down';
    responseTime?: number;
    error?: string;
  }>;
  metrics: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
}

export interface MetricsRequest {
  startDate?: string;
  endDate?: string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

export interface MetricsResponse {
  period: {
    startDate: string;
    endDate: string;
    granularity: string;
  };
  data: Array<{
    timestamp: string;
    value: number;
    metric: string;
  }>;
}