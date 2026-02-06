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

export enum ItemStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  COMING_SOON = 'COMING_SOON'
}

export enum ECollaboratorRole {
  PHOTOGRAPHER = 'PHOTOGRAPHER',
  ASSISTANT = 'ASSISTANT',
  PRODUCER = 'PRODUCER',
  OTHER = 'OTHER',
}

export enum ExperienceLevel {
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM'
}