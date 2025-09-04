import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { logDebug } from '../utils/logger.js';
import { secureStorage } from '../utils/secureStorage.js';
import { normalizeString } from '../utils/string';

// Configuração da URL da API
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

// ✅ PRODUCTION-SAFE LOGGING
logDebug('API Configuration', {
  component: 'API',
  action: 'initialization',
  data: {
    API_BASE_URL,
    API_URL,
    environment: (import.meta as any).env?.MODE,
  },
});

// ✅ AXIOS INSTANCE WITH SECURITY
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: parseInt((import.meta as any).env?.VITE_API_TIMEOUT as string) || 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ SECURE REQUEST INTERCEPTOR
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = secureStorage.get('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Automatically add Idempotency-Key for mutating requests if not provided
  try {
  const method = normalizeString(String(config.method || 'get'));
  if ((method === 'post' || method === 'put' || method === 'patch' || method === 'delete') && config.headers) {
      if (!config.headers['Idempotency-Key'] && !config.headers['idempotency-key']) {
        // lazy require to avoid top-level polyfills issues
        // use crypto.randomUUID when available
        let key = '';
        if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
          key = (crypto as any).randomUUID();
        } else {
          // fallback to timestamp+random
          key = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
        }
        config.headers['Idempotency-Key'] = key;
      }
    }
  } catch (e) {
    // don't block the request on idempotency generation failures
    logDebug('Idempotency generation failed', { e });
  }
  return config;
});

// ✅ SECURE RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      (error as { response?: { status?: number } }).response?.status === 401
    ) {
      secureStorage.remove('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ✅ SECURE FETCH UTILITY
export const apiFetch = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = secureStorage.get('token');
  const url = `${API_BASE_URL}${endpoint}`;

  // Detectar se o body é FormData para não definir Content-Type
  const isFormData = options.body instanceof FormData;
  
  const config: RequestInit = {
    ...options,
    headers: {
      // Só definir Content-Type se não for FormData
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  // Add Idempotency-Key for mutating requests if not provided
  try {
    const method = (config.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const headers = config.headers as Record<string, string> | undefined;
      if (headers && !('Idempotency-Key' in headers) && !('idempotency-key' in headers)) {
        if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
          headers['Idempotency-Key'] = (crypto as any).randomUUID();
        } else {
          headers['Idempotency-Key'] = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
        }
        config.headers = headers;
      }
    }
  } catch {
    // ignore
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    if (response.status === 401) {
      secureStorage.remove('token');
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    // Tentar extrair mensagem detalhada do servidor
    let message = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const text = await response.text();
      if (text) {
        try {
          const data = JSON.parse(text);
          message = (data.error || data.message || message) as string;
        } catch {
          // não é JSON, usa texto puro
          message = text;
        }
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
};

// ===== 🔗 API ENDPOINTS =====

export const equipmentAPI = {
  getAll: () => api.get('/equipment'),
  getById: (id: string) => api.get(`/equipment/${id}`),
  create: (data: Record<string, unknown>) => api.post('/equipment', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/equipment/${id}`, data),
  delete: (id: string) => api.delete(`/equipment/${id}`),
  search: (query: string) => api.get(`/equipment/search?q=${encodeURIComponent(query)}`),
  getByCategory: (categoryId: string) => api.get(`/equipment/category/${categoryId}`),
};

export const kitAPI = {
  getAll: () => api.get('/kits'),
  getById: (id: string) => api.get(`/kits/${id}`),
  create: (data: Record<string, unknown>) => api.post('/kits', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/kits/${id}`, data),
  delete: (id: string) => api.delete(`/kits/${id}`),
  getRecommended: () => api.get('/kits/recommended'),
  getPopular: () => api.get('/kits/popular'),
};

export const categoryAPI = {
  getAll: () => api.get('/categories'),
  getById: (id: string) => api.get(`/categories/${id}`),
  create: (data: Record<string, unknown>) => api.post('/categories', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
  getWithEquipmentCount: () => api.get('/categories/with-counts'),
  getFeatured: () => api.get('/categories/featured'),
};

export const bookingAPI = {
  getAll: (filters?: Record<string, unknown>) => api.get('/bookings', { params: filters }),
  getById: (id: string) => api.get(`/bookings/${id}`),
  create: (data: Record<string, unknown>) => api.post('/bookings', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/bookings/${id}`, data),
  delete: (id: string) => api.delete(`/bookings/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/bookings/${id}/status`, { status }),
  confirm: (id: string) => api.post(`/bookings/${id}/confirm`),
  // Confirma a reserva com preço e colaboradores (admin)
  confirmWithDetails: (id: string, data: Record<string, unknown>) =>
    api.put(`/bookings/${id}/confirm-details`, data),
  cancel: (id: string, reason?: string) => api.post(`/bookings/${id}/cancel`, { reason }),
  getMyBookings: () => api.get('/bookings/me'),
  getUpcoming: () => api.get('/bookings/upcoming'),
  getHistory: () => api.get('/bookings/history'),
  getDashboardStats: () => api.get('/bookings/stats'),
  getCalendar: (month: string, year: string) =>
    api.get(`/bookings/calendar?month=${month}&year=${year}`),
};

export const collaboratorsAPI = {
  getAll: () => api.get('/admin/collaborators'),
  getById: (id: string) => api.get(`/admin/collaborators/${id}`),
  create: (data: Record<string, unknown>) => api.post('/admin/collaborators', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/admin/collaborators/${id}`, data),
  delete: (id: string) => api.delete(`/admin/collaborators/${id}`),
  // Enviar convite por e-mail (admin)
  invite: (email: string) => api.post('/admin/collaborators/invite', { email }),
  // Dashboard pessoal do colaborador
  getMyDashboard: () => api.get('/collaborators/me/dashboard'),
};

export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (userData: Record<string, unknown>) => api.post('/auth/register', userData),
  // Registro público a partir de um convite (token)
  registerFromInvite: (data: { token: string; email: string; name: string; password: string }) =>
    api.post('/auth/register-from-invite', data),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  getProfile: () => api.get('/auth/profile'),
  getStats: () => api.get('/user/stats'),
  getFavorites: () => api.get('/user/favorites'),
  updateProfile: (data: Record<string, unknown>) => api.put('/auth/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  requestPasswordReset: (email: string) => api.post('/auth/request-reset', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
  googleLogin: (token: string) => api.post('/auth/google', { token }),
  facebookLogin: (token: string) => api.post('/auth/facebook', { token }),
};

export const reviewAPI = {
  getAll: (filters?: Record<string, unknown>) => api.get('/reviews', { params: filters }),
  getByEquipment: (equipmentId: string) => api.get(`/reviews/equipment/${equipmentId}`),
  getByUser: (userId?: string) => api.get(`/reviews/user/${userId || 'me'}`),
  create: (data: Record<string, unknown>) => api.post('/reviews', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/reviews/${id}`, data),
  delete: (id: string) => api.delete(`/reviews/${id}`),
  approve: (id: string) => api.post(`/reviews/${id}/approve`),
  reject: (id: string) => api.post(`/reviews/${id}/reject`),
  getStats: () => api.get('/reviews/stats'),
  getRecent: (limit: number = 5) => api.get(`/reviews/recent?limit=${limit}`),
};

export const portfolioAPI = {
  getAll: () => api.get('/portfolio'),
  getById: (id: string) => api.get(`/portfolio/${id}`),
  create: (data: Record<string, unknown>) => api.post('/portfolio', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/portfolio/${id}`, data),
  delete: (id: string) => api.delete(`/portfolio/${id}`),
  uploadImages: (id: string, formData: FormData) =>
    api.post(`/portfolio/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteImage: (id: string, imageId: string) => api.delete(`/portfolio/${id}/images/${imageId}`),
  setFeatured: (id: string, featured: boolean) =>
    api.patch(`/portfolio/${id}/featured`, { featured }),
  updateVisibility: (id: string, isPublic: boolean) =>
    api.patch(`/portfolio/${id}/visibility`, { isPublic }),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
  getRevenue: (period: string) => api.get(`/dashboard/revenue?period=${period}`),
  getBookingTrends: () => api.get('/dashboard/booking-trends'),
  getTopEquipment: () => api.get('/dashboard/top-equipment'),
  getTopClients: () => api.get('/dashboard/top-clients'),
  getLiveStats: () => api.get('/dashboard/live-stats'),
  getNotifications: () => api.get('/dashboard/notifications'),
};

export const paymentAPI = {
  createPaymentIntent: (bookingId: string) => api.post(`/payments/create-intent/${bookingId}`),
  confirmPayment: (paymentIntentId: string) => api.post(`/payments/confirm/${paymentIntentId}`),
  refund: (paymentId: string, amount?: number) =>
    api.post(`/payments/refund/${paymentId}`, { amount }),
  getHistory: () => api.get('/payments/history'),
  getByBooking: (bookingId: string) => api.get(`/payments/booking/${bookingId}`),
  getAllPayments: (filters?: Record<string, unknown>) =>
    api.get('/payments/all', { params: filters }),
  getPaymentStats: () => api.get('/payments/stats'),
};

// ✅ HEALTH CHECK
export const healthAPI = {
  check: () => api.get('/health'),
  detailed: () => api.get('/health/detailed'),
};

// ✅ QUOTE REQUESTS
export const quoteAPI = {
  submit: (data: Record<string, unknown>) => api.post('/quotes', data),
  getAll: () => api.get('/quotes'),
  getById: (id: string) => api.get(`/quotes/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/quotes/${id}/status`, { status }),
  respond: (id: string, response: Record<string, unknown>) =>
    api.post(`/quotes/${id}/respond`, response),
};

// ✅ FALLBACK PARA COMPATIBILIDADE
export default api;
