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
