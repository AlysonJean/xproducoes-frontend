
import { BookingStatus } from '../enums';
import { Equipment, Kit, KitItem, Service } from './equipment';
import { User } from './user';

// ================================
// INTERFACES DE RESERVAS
// ================================

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
        collaborator?: unknown;
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
  serviceValue?: number;
  paymentProofUrl?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  addressNumber?: string;
  addressComplement?: string;
  eventDuration?: number;
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
  internalNotes?: string;
  specialRequests?: string;
  setupTime?: string;
  pickupTime?: string;
  createdAt?: string;
  updatedAt?: string;
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

// ================================
// TIPOS PARA CALENDÁRIO
// ================================

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
    resource?: unknown;
  allDay?: boolean;
  booking?: Booking;
  equipmentCount?: number;
  clientName?: string;
  status?: BookingStatus;
  color?: string;
}