// Re-export all types for backward compatibility
export * from './enums';
export * from './domains/user';
export * from './domains/equipment';
export * from './domains/booking';
export * from './domains/collaborator';
export * from './domains/dashboard';
export * from './ui/index';
export * from './forms/index';
export * from './api/index';

// Export specific types from types.ts that are not in conflict
export type {
  PortfolioFilters,
  KitFilters,
  EquipmentFilters,
  PortfolioItem,
  SearchFiltersProps,
  PortfolioCardProps,
  KitCardProps,
  ConfirmDialogProps,
  ClientResponse,
  HttpRequestConfig,
  HttpResponse,
  HttpClient,
  ServiceWorkerState,
  ServiceWorkerActions,
  PWAInstallHook,
  LoadingSize,
  LoadingVariant,
  LoadingState,
  LoadingContextType,
  ModalNames,
  ModalPropsMap,
  FavoriteItem,
  GeminiSuggestionResponse,
  DiagnosticResult,
  KitFormData,
  KitCreateData,
  FormatOptions,
  Address,
  AnchorOptions,
  ScriptOptions,
  QuoteMessageParams,
  ClientProfile,
  ProfileFormData,
  ProfileSettings,
  SecuritySettings,
  PrivacySettings,
  PaymentSettings,
  CustomQuoteFormData,
  Notification,
  NotificationSettings,
  ReportData,
  TimeSlot,
  SpecialDate,
  AvailabilityData,
  EarningsData,
  AdminReview,
  CalendarEvent,
  ProtectedRouteProps
} from './types';

// ================================
// TIPOS GLOBAIS E UTILITÁRIOS
// ================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
} & {};

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export type NonNullable<T> = T extends null | undefined ? never : T;

export type ValueOf<T> = T[keyof T];

export type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;

export type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

export type NonFunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

// ================================
// TIPOS PARA REACT E COMPONENTES
// ================================

export type ComponentProps<T> = T extends React.ComponentType<infer P> ? P : never;

export type FCProps<T> = T extends React.FC<infer P> ? P : never;

export type EventHandler<T = Element, E = Event> = (event: E & { currentTarget: T }) => void;

export type ChangeHandler<T = string> = (value: T) => void;

export type SubmitHandler<T = any> = (data: T) => void | Promise<void>;

export type AsyncFunction<T = any, R = any> = (...args: T[]) => Promise<R>;

export type SyncFunction<T = any, R = any> = (...args: T[]) => R;

// ================================
// TIPOS PARA API E HTTP
// ================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export type HttpStatusCode =
  | 200 | 201 | 202 | 204 | 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503;

export type ApiEndpoint = `/${string}`;

export type QueryParams = Record<string, string | number | boolean | string[] | undefined>;

export type RequestHeaders = Record<string, string>;

export type ResponseHeaders = Record<string, string>;

// ================================
// TIPOS PARA VALIDAÇÃO
// ================================

export type ValidationRule<T = any> = {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => boolean | string;
  message?: string;
};

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

export type FieldValidation<T = any> = {
  [K in keyof T]?: ValidationRule<T[K]>;
};

// ================================
// TIPOS PARA PAGINAÇÃO
// ================================

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedData<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ================================
// TIPOS PARA FILTROS E BUSCA
// ================================

export type SortDirection = 'asc' | 'desc';

export type FilterOperator =
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'nin' | 'contains' | 'ncontains'
  | 'startswith' | 'endswith';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
}

export interface SearchFilters {
  query?: string;
  filters?: FilterCondition[];
  sortBy?: string;
  sortOrder?: SortDirection;
  pagination?: PaginationParams;
}

// ================================
// TIPOS PARA NOTIFICAÇÕES
// ================================

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ================================
// TIPOS PARA MODAIS E DIALOGS
// ================================

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalConfig {
  size?: ModalSize;
  closable?: boolean;
  backdrop?: 'static' | 'blur' | 'none';
  position?: 'center' | 'top' | 'bottom';
  animation?: boolean;
}

export interface DialogConfig extends ModalConfig {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'outline';
  onConfirm?: () => void;
  onCancel?: () => void;
}

// ================================
// TIPOS PARA UPLOAD E ARQUIVOS
// ================================

export type FileType = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';

export interface FileUploadConfig {
  accept?: string;
  maxSize?: number; // em bytes
  maxFiles?: number;
  multiple?: boolean;
  folder?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  uploadedBy?: string;
}

// ================================
// TIPOS PARA TEMAS E ESTILOS
// ================================

export type ThemeMode = 'light' | 'dark' | 'auto';

export type ColorScheme = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}

export interface ThemeConfig {
  mode: ThemeMode;
  colors: ThemeColors;
  borderRadius: number;
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// ================================
// TIPOS PARA LOCALIZAÇÃO E IDIOMA
// ================================

export type Language = 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR';

export interface LocaleConfig {
  language: Language;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  timezone: string;
}

export type TranslationKey = string;

export type Translations = Record<TranslationKey, string>;

// ================================
// TIPOS PARA PERFORMANCE E MONITORAMENTO
// ================================

export interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  data?: unknown;
}

// ================================
// TIPOS PARA CONTEXTO E STATE MANAGEMENT
// ================================

export interface AppContextValue {
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  theme: ThemeConfig;
  locale: LocaleConfig;
  notifications: NotificationData[];
}

export interface StoreState {
  user: any | null;
  ui: {
    theme: ThemeConfig;
    locale: LocaleConfig;
    notifications: NotificationData[];
    modals: Record<string, boolean>;
  };
  data: {
    equipment: any[];
    bookings: any[];
    categories: any[];
    kits: any[];
  };
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
}

// ================================
// TIPOS PARA HOOKS CUSTOMIZADOS
// ================================

export type UseAsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export type UsePaginationState = {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type UseFormState<T> = {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
};

// ================================
// TIPOS PARA WEB WORKERS E SERVICE WORKERS
// ================================

export interface WorkerMessage<T = any> {
  type: string;
  payload: T;
  id?: string;
  timestamp?: number;
}

export interface ServiceWorkerMessage extends WorkerMessage {
  action: 'update' | 'skipWaiting' | 'getVersion' | 'cache' | 'uncache';
}

export interface WebWorkerMessage extends WorkerMessage {
  action: string;
  transfer?: Transferable[];
}

// ================================
// TIPOS PARA PWA E OFFLINE
// ================================

export type CacheStrategy = 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only';

export interface PWAManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser';
  background_color: string;
  theme_color: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: 'any' | 'maskable';
  }>;
  categories?: string[];
  lang?: string;
  dir?: 'ltr' | 'rtl';
}

export interface OfflineConfig {
  cacheName: string;
  strategy: CacheStrategy;
  urlsToCache: string[];
  maxAge?: number;
  maxEntries?: number;
}

// ================================
// TIPOS PARA ACESSIBILIDADE
// ================================

export type AriaRole =
  | 'alert' | 'alertdialog' | 'application' | 'article' | 'banner' | 'button'
  | 'cell' | 'checkbox' | 'columnheader' | 'combobox' | 'complementary'
  | 'contentinfo' | 'definition' | 'dialog' | 'directory' | 'document'
  | 'feed' | 'figure' | 'form' | 'grid' | 'gridcell' | 'group' | 'heading'
  | 'img' | 'link' | 'list' | 'listbox' | 'listitem' | 'log' | 'main'
  | 'marquee' | 'math' | 'meter' | 'menu' | 'menubar' | 'menuitem'
  | 'menuitemcheckbox' | 'menuitemradio' | 'navigation' | 'none' | 'note'
  | 'option' | 'presentation' | 'progressbar' | 'radio' | 'radiogroup'
  | 'region' | 'row' | 'rowgroup' | 'rowheader' | 'scrollbar' | 'search'
  | 'searchbox' | 'separator' | 'slider' | 'spinbutton' | 'status'
  | 'switch' | 'tab' | 'table' | 'tablist' | 'tabpanel' | 'term'
  | 'textbox' | 'timer' | 'toolbar' | 'tooltip' | 'tree' | 'treegrid'
  | 'treeitem';

export interface AriaProps {
  role?: AriaRole;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean;
  'aria-disabled'?: boolean;
  'aria-required'?: boolean;
  'aria-invalid'?: boolean;
  'aria-live'?: 'off' | 'assertive' | 'polite';
  'aria-atomic'?: boolean;
}

// ================================
// TIPOS PARA ANIMAÇÕES E TRANSIÇÕES
// ================================

export type AnimationType = 'fade' | 'slide' | 'scale' | 'bounce' | 'rotate' | 'flip';

export type TransitionType = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';

export interface AnimationConfig {
  type: AnimationType;
  duration: number;
  delay?: number;
  easing?: TransitionType;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
}

export interface TransitionConfig {
  property: string;
  duration: number;
  delay?: number;
  easing?: TransitionType;
  timing?: string;
}

// ================================
// TIPOS PARA GRÁFICOS E VISUALIZAÇÃO
// ================================

export type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'radar';

export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
}

export interface ChartDataset {
  label: string;
  data: ChartDataPoint[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
}

export interface ChartConfig {
  type: ChartType;
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
  options?: {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    plugins?: {
      legend?: {
        display?: boolean;
        position?: 'top' | 'bottom' | 'left' | 'right';
      };
      tooltip?: {
        enabled?: boolean;
        mode?: 'point' | 'nearest' | 'index' | 'dataset' | 'x' | 'y';
      };
    };
    scales?: {
      x?: {
        display?: boolean;
        title?: {
          display?: boolean;
          text?: string;
        };
      };
      y?: {
        display?: boolean;
        title?: {
          display?: boolean;
          text?: string;
        };
      };
    };
  };
}

// ================================
// TIPOS PARA DRAG AND DROP
// ================================

export interface DragItem {
  id: string;
  type: string;
  data?: any;
}

export interface DropZone {
  id: string;
  accepts: string[];
  onDrop: (item: DragItem) => void;
  onHover?: (item: DragItem) => void;
}

export interface DragState {
  isDragging: boolean;
  draggedItem: DragItem | null;
  dragOffset: { x: number; y: number };
}

// ================================
// TIPOS PARA VIRTUALIZAÇÃO
// ================================

export interface VirtualItem {
  index: number;
  start: number;
  end: number;
  size: number;
}

export interface VirtualListConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  totalItems: number;
}

export interface VirtualGridConfig extends VirtualListConfig {
  itemWidth: number;
  containerWidth: number;
  gap?: number;
}

// ================================
// TIPOS PARA TESTES
// ================================

export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface TestResult {
  id: string;
  name: string;
  status: TestStatus;
  duration: number;
  error?: string;
  stackTrace?: string;
  assertions?: number;
  failures?: number;
}

export interface TestSuite {
  id: string;
  name: string;
  tests: TestResult[];
  status: TestStatus;
  duration: number;
  startTime: string;
  endTime: string;
}

export interface TestRun {
  id: string;
  suites: TestSuite[];
  status: TestStatus;
  duration: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
}