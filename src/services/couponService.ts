import { api } from './api';

export type CouponDiscountType = 'PERCENTAGE' | 'FIXED';

export interface Coupon {
  id: string;
  code: string;
  description?: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderValue?: number | null;
  maxDiscountAmount?: number | null;
  maxUses?: number | null;
  maxUsesPerClient?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  active: boolean;
  usedCount: number;
  createdAt: string;
  updatedAt: string;
}

export type CouponInput = Omit<Coupon, 'id' | 'usedCount' | 'createdAt' | 'updatedAt'>;

/**
 * Dia da validade do cupom, "AAAA-MM-DD", para o <input type="date"> e para a lista.
 * Auditoria completa (19/11/2026): o servidor grava o início e o fim do dia de Brasília (o fim é 02:59:59.999Z do dia
 * seguinte), então o dia sai pelo fuso de Brasília, e não pelos 10 primeiros caracteres do ISO. Os cupons gravados antes
 * têm a meia-noite UTC exata e valem o dia escrito, a mesma regra do servidor (couponService.couponEdge).
 */
export function couponDay(value?: string | null): string {
  if (!value) return '';
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return '';
  if (instant.getTime() % 86_400_000 === 0) return instant.toISOString().slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}

/** O mesmo dia, "DD/MM/AAAA". */
export function couponDayBR(value?: string | null): string {
  const day = couponDay(value);
  return day ? day.split('-').reverse().join('/') : '';
}

export const couponService = {
  getAll: async (): Promise<Coupon[]> => {
    const response = await api.get('/coupons');
    return response.data ?? [];
  },

  create: async (data: Partial<CouponInput>): Promise<Coupon> => {
    const response = await api.post('/coupons', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CouponInput>): Promise<Coupon> => {
    const response = await api.put(`/coupons/${id}`, data);
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/coupons/${id}`);
  },
};
