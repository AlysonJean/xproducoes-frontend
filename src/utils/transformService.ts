import type { Service } from '@/types/types';
import { toNumber } from './typeSafeFormatters';

function sanitizeImageUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  try {
    if (trimmed.startsWith('/uploads') || trimmed.startsWith('uploads/')) return '';
    if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return '';
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const u = new URL(trimmed, base);
    return u.toString();
  } catch {
    return '';
  }
}

export function transformService(service: Service): Service {
  return {
    ...service,
    name: service.name ?? 'Serviço sem nome',
    price: toNumber(service.price),
    duration: toNumber(service.duration),
    imageUrl: sanitizeImageUrl(service.imageUrl),
    description: service.description ?? '',
    status: service.status ?? 'ACTIVE',
  };
}
