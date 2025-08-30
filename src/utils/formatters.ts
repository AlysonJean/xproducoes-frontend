/**
 * 🔒 Formatters Seguros - Atualizado com Utilitários de Segurança
 * Resolve definitivamente o problema kit.price.toFixed is not a function
 */
import { formatPrice } from './typeSafeFormatters'; // Caminho relativo correto

// Utilitário seguro para converter qualquer valor para número
export const toNumber = (value: number | string): number => {
  return typeof value === 'string' ? Number(value.replace(/[^\d.]/g, '')) : value;
};
export const parsePrice = toNumber;
export const totalPrice = (prices: number[]) =>
  prices.reduce((sum, price) => sum + toNumber(price), 0);

/**
 * ✅ VERSÃO SEGURA: Formata preço sempre como número
 * Resolve: kit.price.toFixed is not a function
 */
export const formatCurrency = (value: number | string) => formatPrice(toNumber(value));

/**
 * ✅ VERSÃO SEGURA: Calcula economia entre preços
 * Usado em: KitDetailPage para mostrar economia
 */
// Implemente a lógica de savings localmente se necessário
export const calculateSavingsAmount = (originalPrice: number, currentPrice: number) => {
  return Math.max(0, originalPrice - currentPrice);
};

/**
 * ✅ VERSÃO SEGURA: Valida preço em formulários
 */
export const validatePrice = (priceStr: string) => {
  const safe = toNumber(priceStr);
  return safe > 0;
};

/**
 * ✅ VERSÃO SEGURA: Transforma dados do backend para frontend
 * Remove problema de conversão Decimal -> Number
 */
import type { Equipment } from '../types/types';
export const safeTransformEquipment = (equipment: Equipment) => {
  return {
    ...equipment,
    price: toNumber(equipment.price ?? 0),
    pricePerHour: toNumber(equipment.pricePerHour ?? 0),
  };
};

import type { Kit } from '../types/types';
export const safeTransformKit = (kit: Kit) => {
  const transformed = {
    ...kit,
    price: toNumber(kit.price ?? 0),
    // Kit não tem pricePerHour, apenas Equipment
    equipments: (kit.equipments ?? []).map(safeTransformEquipment),
  };
  return transformed;
};

import type { Booking } from '../types/types';
export const safeTransformBooking = (booking: Booking) => {
  const transformed = {
    ...booking,
    // Transformar equipments que podem estar no formato {equipmentId, equipment}
    equipments: booking.equipments?.map((item: any) => {
      if (item.equipment) {
        return safeTransformEquipment(item.equipment);
      }
      return safeTransformEquipment(item);
    }),
    // Transformar kits que podem estar no formato {kitId, kit}
    kits: booking.kits?.map((item: any) => {
      if (item.kit) {
        return safeTransformKit(item.kit);
      }
      return safeTransformKit(item);
    }),
  };
  return transformed;
};

// ===== UTILITÁRIOS DE FORMATAÇÃO =====

/**
 * Formata data para exibição
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
};

/**
 * Formata data e hora
 */
export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR');
};

/**
 * Trunca texto com elipses
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Formata telefone brasileiro
 */
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

/**
 * Formata CEP brasileiro
 */
export const formatCEP = (cep: string): string => {
  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }
  return cep;
};
