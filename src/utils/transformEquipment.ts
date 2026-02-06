import type { Equipment } from '@/types/domains/equipment';

function sanitizeImageUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  // Hosts/casos problemáticos que geram erros no dev
  const invalidHosts = ['via.placeholder.com', 'cdn.exemplo.com'];
  try {
    // Caminhos locais de uploads não são mais servidos: forçar fallback
    if (trimmed.startsWith('/uploads') || trimmed.startsWith('uploads/')) return '';
    if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return '';
    const u = new URL(trimmed, window.location.origin);
    if (invalidHosts.includes(u.hostname)) return '';
    return u.toString();
  } catch {
    // URL inválida → fallback
    return '';
  }
}

import { toNumber } from './typeSafeFormatters';

export function transformEquipment(equipment: Equipment): Equipment {
  // Validação e transformação robusta
  return {
    ...equipment,
    name: equipment.name ?? 'Equipamento sem nome',
    price: toNumber(equipment.price),
    // Usa dailyPrice como fallback se pricePerHour for 0 ou indefinido
    pricePerHour: toNumber(equipment.pricePerHour) || toNumber(equipment.dailyPrice) || 0,
    dailyPrice: toNumber(equipment.dailyPrice),
    isAvailable: typeof equipment.isAvailable === 'boolean' ? equipment.isAvailable : false,
    imageUrl: sanitizeImageUrl(equipment.imageUrl),
    description: equipment.description ?? '',
    brand: equipment.brand ?? '',
    model: equipment.model ?? '',
    tags: Array.isArray(equipment.tags) ? equipment.tags : [],
    categoryId: equipment.categoryId ?? '',
  };
}
