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

export interface Kit {
  id: string;
  name: string;
  equipments: Equipment[];
  imageUrl?: string;
  description?: string;
  price?: number;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
  images?: string[];
}