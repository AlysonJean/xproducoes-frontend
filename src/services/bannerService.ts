
import axios from 'axios';
import { api } from './api';
import { Banner } from '../types/types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const bannerService = {
  getPublicBanners: async (): Promise<Banner[]> => {
    try {
      const response = await api.get<Banner[]>('/banners/public', { timeout: 30000 });
      return response.data;
    } catch (error) {
      // Render free tier can take longer on cold starts; retry once with longer timeout.
      if (axios.isAxiosError(error) && (error.code === 'ECONNABORTED' || !error.response)) {
        await delay(1500);
        const retry = await api.get<Banner[]>('/banners/public', { timeout: 60000 });
        return retry.data;
      }
      throw error;
    }
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
