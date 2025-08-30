// ================================
// ARQUIVO DE TIPOS COMPARTILHADOS
// ================================
// Este arquivo re-exporta os tipos do types.ts para compatibilidade com imports antigos

export * from './types';

// Alias para backward compatibility
export type { Equipment, Category, Kit, User, Booking, BookingStatus, UserRole, EquipmentStatus } from './types';
export type { ICollaborator, Event, DashboardStats, Review, PortfolioItem, FaqItem } from './types';
export type { BaseModalProps, SafeBooking, LoadingSize, LoadingVariant, LoadingState, LoadingContextType } from './types';
export type { HttpClient, HttpResponse, HttpRequestConfig, DiagnosticResult, GeminiSuggestionResponse } from './types';
export type { PaymentModalProps, PaymentData, PaginationProps, PortfolioCardProps } from './types';
export type { FavoriteButtonProps, GoogleAuthButtonProps, KitCardProps } from './types';
export type { AdminDashboardStats, Activity, CalendarBooking, DashboardEvent } from './types';
export type { ServiceWorkerState, ServiceWorkerActions, BeforeInstallPromptEvent, PerformanceMetrics, PWAInstallHook } from './types';
