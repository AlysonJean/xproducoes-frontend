import type { Kit } from '@/types/domains/equipment';
import { toNumber } from './typeSafeFormatters';

function sanitizeImageUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const invalidHosts = ['via.placeholder.com', 'cdn.exemplo.com'];
  try {
    if (trimmed.startsWith('/uploads') || trimmed.startsWith('uploads/')) return '';
    if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return '';
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const u = new URL(trimmed, base);
    if (invalidHosts.includes(u.hostname)) return '';
    return u.toString();
  } catch {
    return '';
  }
}

export function transformKit(kit: Kit): Kit {
  return {
    ...kit,
    name: kit.name ?? 'Kit sem nome',
    description: kit.description ?? '',
    // Garante que o preço seja um número, mesmo que venha como string
    price: toNumber(kit.price),
    imageUrl: sanitizeImageUrl(kit.imageUrl),
    equipments: Array.isArray(kit.equipments) 
      ? kit.equipments 
      : (Array.isArray(kit.items) ? kit.items.map(i => i.equipment).filter((e): e is NonNullable<typeof e> => !!e) : []),
    items: Array.isArray(kit.items) ? kit.items : [],
    isActive: typeof kit.isActive === 'boolean' ? kit.isActive : true,
  };
}
