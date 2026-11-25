// ================================
// INTERFACES DE DASHBOARD
// ================================

import type { ReactNode } from 'react';

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
  activeBookings?: number;
  completedBookings?: number;
  totalSpent?: number;
  averageBookingValue?: number;
  lastBookingDate?: string;
  nextBookingDate?: string;
  favoriteEquipments?: number;
}

// Onda 3 da auditoria do status (M10): o que falta receber das reservas confirmadas (ou depois), sem o histórico importado.
export interface DashboardReceivables {
  noPaymentCount: number;
  noPaymentTotal: number;
  partialCount: number;
  partialBalance: number;
  // Teste do painel de 25/11/2026 (A-02): as parciais sem o valor recebido (nem contrato aceito), com o total delas.
  partialUnknownCount?: number;
  partialUnknownTotal?: number;
  overdueBalanceCount: number;
  total: number;
}

export interface AdminDashboardStats {
  receivables?: DashboardReceivables;
  totalRevenue: number;
  revenueGrowth: number;
  // Receita do mês corrente (concluídas, pela data do evento), a base da seta do Faturamento.
  currentMonthRevenue?: number;
  newBookingsThisMonth: number;
  bookingsGrowth: number;
  totalClients: number;
  pendingBookings: number;
  completedBookings: number;
  conversionRate: number;
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

export type DashboardEvent = Event;

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

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  color: 'primary' | 'success' | 'warning' | 'info';
  badge?: string;
}

export interface CalendarDay {
  date: Date;
  bookings: unknown[];
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

export interface ReferralStats {
  code: string;
  discountPercent: number;
  timesUsed: number;
  rewardsEarned: number;
  /** Onda 4 da auditoria de 19/11 (F3-21): o teto do código (null = sem teto) e os números da recompensa. */
  maxDiscount?: number | null;
  rewardDiscountPercent?: number;
  rewardMaxDiscount?: number;
  rewardValidityDays?: number;
}
