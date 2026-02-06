import api from './api';

export interface SocialPost {
  id: string;
  settingId: string;
  platformId: string;
  mediaUrl: string;
  permalink: string;
  caption?: string;
  author: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  postedAt: string;
  fetchedAt: string;
}

interface PostsResponse {
  data: SocialPost[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const socialService = {
  getPosts: async (params: { eventId?: string; settingId?: string; slug?: string; status?: string; page?: number; limit?: number }) => {
    const response = await api.get<PostsResponse>('/admin/social/posts', { params });
    return response.data;
  },

  moderatePost: async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const response = await api.put<{ data: SocialPost }>(`/admin/social/posts/${id}/moderate`, { status });
    return response.data;
  },

  syncNow: async (id: string, type: 'event' | 'setting' = 'event') => {
    const payload = type === 'event' ? { eventId: id } : { settingId: id };
    const response = await api.post('/admin/social/sync', payload);
    return response.data;
  },

  // Standalone Features
  createWall: async (data: { name: string; hashtag: string; slug?: string; autoApprove?: boolean }) => {
    const response = await api.post<{ data: any }>('/admin/social/create', data);
    return response.data;
  },

  listWalls: async () => {
    const response = await api.get<{ data: any[] }>('/admin/social/walls');
    return response.data;
  }
};
