
import { api } from './api';
import { Banner } from '../types/types';

export const bannerService = {
  getPublicBanners: async (): Promise<Banner[]> => {
    const response = await api.get<Banner[]>('/banners/public');
    return response.data;
  },

  getAllBanners: async (): Promise<Banner[]> => {
    const response = await api.get<Banner[]>('/banners');
    return response.data;
  },

  createBanner: async (data: Partial<Banner>): Promise<Banner> => {
    const response = await api.post<Banner>('/banners', data);
    return response.data;
  },

  updateBanner: async (id: string, data: Partial<Banner>): Promise<Banner> => {
    const response = await api.put<Banner>(`/banners/${id}`, data);
    return response.data;
  },

  deleteBanner: async (id: string): Promise<void> => {
    await api.delete(`/banners/${id}`);
  }
};
