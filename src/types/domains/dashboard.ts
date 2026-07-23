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

export interface AdminDashboardStats {
  totalRevenue: number;
  revenueGrowth: number;
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
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: string;
  link?: string;
}