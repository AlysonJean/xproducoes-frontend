import { ECollaboratorRole, PaymentStatus } from '../enums';

// ================================
// INTERFACES DE COLABORADORES
// ================================

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