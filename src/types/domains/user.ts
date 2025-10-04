import { UserRole } from '../enums';

// ================================
// INTERFACES DE USUÁRIO
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
  memberSince: string;
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
  twoFactorEnabled: boolean;
  loginNotifications: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'clients_only';
  showEmail: boolean;
  showPhone: boolean;
  allowReviews: boolean;
  allowMessages: boolean;
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