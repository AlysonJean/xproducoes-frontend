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
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

// Situação do pagamento da reserva — campo manual do admin (null/ausente = não informado).
export enum BookingPaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID'
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

export enum ItemStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  COMING_SOON = 'COMING_SOON'
}

// Espelha o enum CollaboratorRole do backend (rótulos em utils/collaboratorRoles.ts). Tinha só 4
// valores, um deles (PRODUCER) inexistente no backend.
export enum ECollaboratorRole {
  PHOTOGRAPHER = 'PHOTOGRAPHER',
  VIDEOGRAPHER = 'VIDEOGRAPHER',
  SOUND_TECHNICIAN = 'SOUND_TECHNICIAN',
  LIGHTING_TECHNICIAN = 'LIGHTING_TECHNICIAN',
  DJ = 'DJ',
  PRESENTER = 'PRESENTER',
  COORDINATOR = 'COORDINATOR',
  ASSISTANT = 'ASSISTANT',
  SECURITY = 'SECURITY',
  TRANSPORT = 'TRANSPORT',
  OTHER = 'OTHER',
}

export enum ExperienceLevel {
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM'
}