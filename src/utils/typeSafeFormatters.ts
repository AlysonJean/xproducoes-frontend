import type { Equipment, Kit, Booking, User } from '../types/types';
import { EquipmentStatus, BookingStatus, UserRole } from '../types/types';

export interface FormatOptions {
  showCurrency?: boolean;
  decimals?: number;
}

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

// ================================
// FORMATADORES DE PREÇO
// ================================

export function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

export const formatMoney = (value: number | string | null | undefined): string => {
  return formatPrice(toNumber(value));
};

export const parsePrice = (value: number | string | null | undefined): number => {
  return toNumber(value);
};

export const totalPrice = (prices: (number | string | null | undefined)[]): number => {
  return prices.reduce((sum: number, price) => sum + toNumber(price), 0);
};

/**
 * ✅ TYPE-SAFE: Formata preço com opções
 */
export const formatCurrency = (value: number | string | null | undefined): string => {
  return formatPrice(toNumber(value));
};

/**
 * ✅ TYPE-SAFE: Converte para número
 */
export const toNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.,-]/g, '').trim();
    if (cleaned === '' || cleaned === '-' || cleaned === ',' || cleaned === '.') return 0;

    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');

    let normalized = cleaned;

    if (lastComma > lastDot) {
      // Treat comma as decimal separator, remove dots (thousands)
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      // Treat dot as decimal separator, remove commas (thousands)
      normalized = cleaned.replace(/,/g, '');
    } else {
      // Only one type or none: default to dot as decimal after converting comma
      normalized = cleaned.replace(',', '.');
    }

    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

/**
 * ✅ TYPE-SAFE: Calcula total
 */
export const calculateTotal = (prices: (number | string | null | undefined)[]): number => {
  return totalPrice(prices);
};

/**
 * ✅ TYPE-SAFE: Calcula economia
 */
export const calculateSavingsAmount = (
  originalPrice: number | string | null | undefined,
  currentPrice: number | string | null | undefined
): number => {
  const orig = toNumber(originalPrice);
  const curr = toNumber(currentPrice);
  return orig > curr ? orig - curr : 0;
};

/**
 * ✅ TYPE-SAFE: Valida preço
 */
export const validatePrice = (priceStr: string): boolean => {
  const safe = toNumber(priceStr);
  return safe > 0;
};

// ================================
// TRANSFORMADORES DE DADOS
// ================================

/**
 * ✅ TYPE-SAFE: Transforma equipment do backend
 */
export const safeTransformEquipment = (equipment: Partial<Equipment>): Equipment => {
  return {
    id: equipment.id || '',
    name: equipment.name || '',
    description: equipment.description ?? '',
    categoryId: equipment.categoryId ?? '',
    dailyPrice: toNumber(equipment.dailyPrice),
    weeklyPrice: equipment.weeklyPrice ? toNumber(equipment.weeklyPrice) : undefined,
    monthlyPrice: equipment.monthlyPrice ? toNumber(equipment.monthlyPrice) : undefined,
    status: equipment.status || EquipmentStatus.AVAILABLE,
    specifications: equipment.specifications || {},
    images: Array.isArray(equipment.images) ? equipment.images : [],
    createdAt: equipment.createdAt || new Date(),
    updatedAt: equipment.updatedAt || new Date(),
  };
};

/**
 * ✅ TYPE-SAFE: Transforma kit do backend
 */
export const safeTransformKit = (kit: Partial<Kit>): Kit => {
  return {
    id: kit.id || '',
    name: kit.name || '',
    description: kit.description ?? '',
    price: toNumber(kit.price),
    imageUrl: kit.imageUrl ?? '',
    equipments: kit.equipments?.map(safeTransformEquipment) || [],
    isActive: kit.isActive ?? true,
    createdAt: kit.createdAt || new Date(),
    updatedAt: kit.updatedAt || new Date(),
  };
};

/**
 * ✅ TYPE-SAFE: Transforma booking do backend
 */
export const safeTransformBooking = (booking: Partial<Booking>): Booking => {
  return {
    id: booking.id || '',
    userId: booking.userId || '',
    startDate: booking.startDate ? new Date(booking.startDate) : new Date(),
    endDate: booking.endDate ? new Date(booking.endDate) : new Date(),
    totalAmount: toNumber(booking.totalAmount),
    status: booking.status || BookingStatus.PENDING,
    notes: booking.notes ?? '',
    equipments: booking.equipments?.map(safeTransformEquipment) || [],
    kits: booking.kits?.map(safeTransformKit) || [],
    createdAt: booking.createdAt || new Date(),
    updatedAt: booking.updatedAt || new Date(),
  };
};

/**
 * ✅ TYPE-SAFE: Transforma user do backend
 */
export const safeTransformUser = (user: Partial<User>): User => {
  return {
    id: user.id || '',
    name: user.name || '',
    email: user.email || '',
    role: user.role || UserRole.CLIENT,
    bio: user.bio,
    location: user.location,
    phone: user.phone,
    avatar: user.avatar,
    isActive: user.isActive ?? true,
    lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
    createdAt: user.createdAt || new Date(),
    updatedAt: user.updatedAt || new Date(),
  };
};

// ================================
// VALIDADORES
// ================================

/**
 * ✅ TYPE-SAFE: Valida equipamento
 */
export const validateEquipment = (equipment: Partial<Equipment>): boolean => {
  return !!(
    equipment.name &&
    equipment.categoryId &&
    equipment.dailyPrice &&
    toNumber(equipment.dailyPrice) > 0
  );
};

/**
 * ✅ TYPE-SAFE: Valida kit
 */
export const validateKit = (kit: Partial<Kit>): boolean => {
  return !!(
    kit.name &&
    kit.price &&
    toNumber(kit.price) > 0 &&
    kit.equipments &&
    kit.equipments.length > 0
  );
};

/**
 * ✅ TYPE-SAFE: Valida booking
 */
export const validateBooking = (booking: Partial<Booking>): boolean => {
  return !!(
    booking.userId &&
    booking.startDate &&
    booking.endDate &&
    booking.totalAmount &&
    toNumber(booking.totalAmount) > 0
  );
};

/**
 * ✅ TYPE-SAFE: Valida user
 */
export const validateUser = (user: Partial<User>): boolean => {
  return !!(
    user.name &&
    user.email &&
    user.role &&
    Object.values(UserRole).includes(user.role)
  );
};

// ================================
// FORMATADORES DE DATA
// ================================

/**
 * ✅ TYPE-SAFE: Formata data para display
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * ✅ TYPE-SAFE: Formata data e hora para display
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * ✅ TYPE-SAFE: Calcula diferença de dias
 */
export const daysDifference = (
  startDate: Date | string,
  endDate: Date | string
): number => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// ================================
// FORMATADORES DE STATUS
// ================================

/**
 * ✅ TYPE-SAFE: Formata status de booking para display
 */
export const formatBookingStatus = (status: BookingStatus): string => {
  const statusMap: Record<BookingStatus, string> = {
    [BookingStatus.DRAFT]: 'Rascunho',
    [BookingStatus.PENDING]: 'Pendente',
    [BookingStatus.CONFIRMED]: 'Confirmado',
    [BookingStatus.IN_PROGRESS]: 'Em Andamento',
    [BookingStatus.COMPLETED]: 'Concluído',
    [BookingStatus.CANCELLED]: 'Cancelado'
  };
  
  return statusMap[status] || status;
};

/**
 * ✅ TYPE-SAFE: Formata status de equipamento para display
 */
export const formatEquipmentStatus = (status: EquipmentStatus): string => {
  const statusMap: Record<EquipmentStatus, string> = {
    [EquipmentStatus.AVAILABLE]: 'Disponível',
    [EquipmentStatus.RENTED]: 'Alugado',
    [EquipmentStatus.MAINTENANCE]: 'Manutenção',
    [EquipmentStatus.UNAVAILABLE]: 'Indisponível'
  };
  
  return statusMap[status] || status;
};

/**
 * ✅ TYPE-SAFE: Formata role de usuário para display
 */
export const formatUserRole = (role: UserRole): string => {
  const roleMap: Record<UserRole, string> = {
    [UserRole.CLIENT]: 'Cliente',
    [UserRole.ADMIN]: 'Administrador',
    [UserRole.COLLABORATOR]: 'Colaborador',
    [UserRole.FREELANCER]: 'Freelancer'
  };
  
  return roleMap[role] || role;
};

// ================================
// UTILITÁRIOS DE CÁLCULO
// ================================

/**
 * ✅ TYPE-SAFE: Calcula preço total de equipamentos
 */
export const calculateEquipmentTotal = (
  equipments: Equipment[],
  days: number = 1
): number => {
  return equipments.reduce((total, equipment) => {
    return total + ((equipment.dailyPrice || 0) * days);
  }, 0);
};

/**
 * ✅ TYPE-SAFE: Calcula preço total de kits
 */
export const calculateKitTotal = (
  kits: Kit[],
  days: number = 1
): number => {
  return kits.reduce((total, kit) => {
    return total + ((kit.price || 0) * days);
  }, 0);
};

/**
 * ✅ TYPE-SAFE: Calcula desconto por período
 */
export const calculatePeriodDiscount = (
  dailyPrice: number,
  days: number
): { total: number; discount: number; originalTotal: number } => {
  const originalTotal = dailyPrice * days;
  let discount = 0;
  
  // Desconto progressivo
  if (days >= 30) {
    discount = 0.2; // 20% para mensais
  } else if (days >= 7) {
    discount = 0.1; // 10% para semanais
  } else if (days >= 3) {
    discount = 0.05; // 5% para 3+ dias
  }
  
  const discountAmount = originalTotal * discount;
  const total = originalTotal - discountAmount;
  
  return {
    total,
    discount: discountAmount,
    originalTotal
  };
};

// ================================
// SANITIZADORES
// ================================

/**
 * ✅ TYPE-SAFE: Sanitiza string para uso seguro
 */
export const sanitizeString = (value: string | null | undefined): string => {
  if (!value) return '';
  return value.trim().replace(/[<>]/g, '');
};

/**
 * ✅ TYPE-SAFE: Sanitiza email
 */
import { normalizeString } from './string';

export const sanitizeEmail = (email: string | null | undefined): string => {
  if (!email) return '';
  return normalizeString(email).trim();
};

/**
 * ✅ TYPE-SAFE: Sanitiza telefone
 */
export const sanitizePhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

// ================================
// EXPORTAÇÕES DEFAULT
// ================================

export default {
  formatPrice,
  formatMoney,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatBookingStatus,
  formatEquipmentStatus,
  formatUserRole,
  toNumber,
  calculateTotal,
  calculateEquipmentTotal,
  calculateKitTotal,
  calculatePeriodDiscount,
  validatePrice,
  validateEquipment,
  validateKit,
  validateBooking,
  validateUser,
  safeTransformEquipment,
  safeTransformKit,
  safeTransformBooking,
  safeTransformUser,
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  daysDifference
};
