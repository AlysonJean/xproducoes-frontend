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

export interface SocialAnnouncement {
  id: string;
  settingId: string;
  title: string;
  message: string;
  type: 'TEXT' | 'IMAGE';
  imageUrl?: string;
  duration: number;
  frequency: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  },

  // Announcements
  getAnnouncements: async (id: string) => {
    const response = await api.get<{ data: SocialAnnouncement[] }>(`/events/${id}/social/announcements`);
    return response.data;
  },

  createAnnouncement: async (id: string, data: Partial<SocialAnnouncement>) => {
    const response = await api.post<{ data: SocialAnnouncement }>(`/events/${id}/social/announcements`, data);
    return response.data;
  },

  updateAnnouncement: async (id: string, data: Partial<SocialAnnouncement>) => {
    const response = await api.put<{ data: SocialAnnouncement }>(`/announcements/${id}`, data);
    return response.data;
  },

  deleteAnnouncement: async (id: string) => {
    const response = await api.delete<{ success: boolean }>(`/announcements/${id}`);
    return response.data;
  }
};
