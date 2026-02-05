import { EquipmentStatus } from '../enums';

// ================================
// INTERFACES DE EQUIPAMENTOS
// ================================

export interface Equipment {
  id: string;
  name: string;
  description?: string;
  dailyPrice?: number;
  weeklyPrice?: number;
  monthlyPrice?: number;
  price?: number;
  pricePerHour?: number;
  status?: EquipmentStatus;
  specifications?: Record<string, any>;
  images?: string[];
  image?: string;
  imageUrl?: string;
  categoryId?: string;
  category?: string | Category;
  isAvailable?: boolean;
  brand?: string;
  model?: string;
  tags?: string[];
  type?: string;
  addedAt?: Date;
  quantity?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  isActive: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface KitItem {
  id: string;
  kitId: string;
  equipmentId?: string;
  serviceId?: string;
  quantity: number;
  equipment?: Equipment;
  service?: Service;
}

export interface Kit {
  id: string;
  name: string;
  items?: KitItem[];
  equipments?: Equipment[];
  imageUrl?: string;
  description?: string;
  price?: number;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  prevSlug?: string | null;
  nextSlug?: string | null;
}

export interface PortfolioItem {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
  images?: string[];
}