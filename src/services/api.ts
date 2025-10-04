import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { logDebug } from '../utils/logger';
import { secureStorage } from '../utils/secureStorage';
import { normalizeString } from '../utils/string';


// Centralização robusta da configuração da URL da API
function getApiUrl(envVar: string, fallback: string) {
  // Em produção, nunca permita fallback para localhost
  if (import.meta.env.MODE === 'production') {
    const value = import.meta.env[envVar];
    if (!value || value.includes('localhost')) {
      throw new Error(
        `Variável de ambiente ${envVar} não definida corretamente em produção. Corrija no painel do Vercel.`
      );
    }
    return value;
  }
  // Em desenvolvimento, permite fallback
  return import.meta.env[envVar] || fallback;
}

const API_BASE_URL = getApiUrl('VITE_API_BASE_URL', 'http://localhost:4000/api/v1');
const API_URL = getApiUrl('VITE_API_URL', 'http://localhost:4000');

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

// ✅ SECURE REQUEST INTERCEPTOR WITH TOKEN REFRESH
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // Get fresh token from secure storage
  const token = secureStorage.get('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add Idempotency-Key for mutating requests if not provided
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

// ✅ Circuit breaker para evitar loops infinitos de refresh
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;
const REFRESH_RESET_TIMEOUT = 60000; // 1 minuto
let lastRefreshAttempt = 0;

// ✅ SECURE RESPONSE INTERCEPTOR WITH AUTO REFRESH AND CIRCUIT BREAKER
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: any) => {
    const originalRequest = error.config;

    // Reset contador após timeout
    if (Date.now() - lastRefreshAttempt > REFRESH_RESET_TIMEOUT) {
      refreshAttempts = 0;
    }

    // If 401 and we haven't tried to refresh yet and haven't exceeded max attempts
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      refreshAttempts < MAX_REFRESH_ATTEMPTS
    ) {
      originalRequest._retry = true;
      refreshAttempts++;
      lastRefreshAttempt = Date.now();

      try {
        // Try to refresh token
        const refreshToken = secureStorage.get('refreshToken');
        if (refreshToken) {
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshResponse.ok) {
            const data = await refreshResponse.json();

            // Update tokens
            secureStorage.set('accessToken', data.accessToken);
            if (data.refreshToken) {
              secureStorage.set('refreshToken', data.refreshToken);
            }
            secureStorage.set('tokenExpiresAt', (Date.now() + (15 * 60 * 1000)).toString());

            // Reset counter on success
            refreshAttempts = 0;

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        logDebug('Token refresh failed', { refreshError, attempt: refreshAttempts });
      }

      // If max attempts reached or refresh failed, force logout
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        logDebug('Max refresh attempts reached, forcing logout', { attempts: refreshAttempts });
      }
      
      // If refresh failed, redirect to login
      secureStorage.remove('accessToken');
      secureStorage.remove('refreshToken');
      secureStorage.remove('tokenExpiresAt');
      refreshAttempts = 0; // Reset for next session
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// ✅ SECURE FETCH UTILITY WITH AUTO REFRESH
export const apiFetch = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const makeRequest = async (url: string, config: RequestInit): Promise<Response> => {
    const response = await fetch(url, config);

    // If 401, try to refresh token and retry
    if (response.status === 401) {
      try {
        const refreshToken = secureStorage.get('refreshToken');
        if (refreshToken) {
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshResponse.ok) {
            const data = await refreshResponse.json();

            // Update tokens
            secureStorage.set('accessToken', data.accessToken);
            if (data.refreshToken) {
              secureStorage.set('refreshToken', data.refreshToken);
            }
            secureStorage.set('tokenExpiresAt', (Date.now() + (15 * 60 * 1000)).toString());

            // Retry with new token
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${data.accessToken}`,
            };
            return fetch(url, config);
          }
        }
      } catch (refreshError) {
        logDebug('Token refresh failed in apiFetch', { refreshError });
      }

      // If refresh failed, clear tokens and redirect
      secureStorage.remove('accessToken');
      secureStorage.remove('refreshToken');
      secureStorage.remove('tokenExpiresAt');
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    return response;
  };

  const url = `${API_BASE_URL}${endpoint}`;

  // Detectar se o body é FormData para não definir Content-Type
  const isFormData = options.body instanceof FormData;

  const config: RequestInit = {
    ...options,
    headers: {
      // Só definir Content-Type se não for FormData
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  };

  // Add current access token
  const token = secureStorage.get('accessToken');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

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

  const response = await makeRequest(url, config);

  if (!response.ok) {
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
  getAll: () => api.get('/api/equipment'),
  getById: (id: string) => api.get(`/api/equipment/${id}`),
  create: (data: Record<string, unknown>) => api.post('/api/equipment', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/equipment/${id}`, data),
  delete: (id: string) => api.delete(`/api/equipment/${id}`),
  search: (query: string) => api.get(`/api/equipment/search?q=${encodeURIComponent(query)}`),
  getByCategory: (categoryId: string) => api.get(`/api/equipment/category/${categoryId}`),
};

export const kitAPI = {
  getAll: () => api.get('/api/kits'),
  getById: (id: string) => api.get(`/api/kits/${id}`),
  create: (data: Record<string, unknown>) => api.post('/api/kits', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/kits/${id}`, data),
  delete: (id: string) => api.delete(`/api/kits/${id}`),
  getRecommended: () => api.get('/api/kits/recommended'),
  getPopular: () => api.get('/api/kits/popular'),
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
  getAll: (filters?: Record<string, unknown>) => api.get('/api/bookings', { params: filters }),
  getById: (id: string) => api.get(`/api/bookings/${id}`),
  create: (data: Record<string, unknown>) => api.post('/api/bookings', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/bookings/${id}`, data),
  delete: (id: string) => api.delete(`/api/bookings/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/api/bookings/${id}/status`, { status }),
  confirm: (id: string) => api.post(`/api/bookings/${id}/confirm`),
  // Confirma a reserva com preço e colaboradores (admin)
  confirmWithDetails: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/bookings/${id}/confirm-details`, data),
  cancel: (id: string, reason?: string) => api.post(`/api/bookings/${id}/cancel`, { reason }),
  getMyBookings: () => api.get('/api/bookings/me'),
  getUpcoming: () => api.get('/api/bookings/upcoming'),
  getHistory: () => api.get('/api/bookings/history'),
  getDashboardStats: () => api.get('/api/bookings/stats'),
  getCalendar: (month: string, year: string) =>
    api.get(`/api/bookings/calendar?month=${month}&year=${year}`),
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
  getMyDashboard: () => api.get('/api/collaborators/me/dashboard'),
};

export const authAPI = {
  login: (email: string, password: string) => api.post('/api/auth/login', { email, password }),
  register: (userData: Record<string, unknown>) => api.post('/api/auth/register', userData),
  // Registro público a partir de um convite (token)
  registerFromInvite: (data: { token: string; email: string; name: string; password: string }) =>
    api.post('/api/auth/register-from-invite', data),
  logout: () => api.post('/api/auth/logout'),
  refresh: (refreshToken: string) => api.post('/api/auth/refresh', { refreshToken }),
  getProfile: () => api.get('/api/auth/profile'),
  getStats: () => api.get('/api/user/stats'),
  getFavorites: () => api.get('/api/user/favorites'),
  updateProfile: (data: Record<string, unknown>) => api.put('/api/auth/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/auth/change-password', { currentPassword, newPassword }),
  requestPasswordReset: (email: string) => api.post('/api/auth/request-reset', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/api/auth/reset-password', { token, newPassword }),
  googleLogin: (token: string) => api.post('/api/auth/google', { token }),
  facebookLogin: (token: string) => api.post('/api/auth/facebook', { token }),
};

export const reviewAPI = {
  getAll: (filters?: Record<string, unknown>) => api.get('/api/reviews', { params: filters }),
  getByEquipment: (equipmentId: string) => api.get(`/api/reviews/equipment/${equipmentId}`),
  getByUser: (userId?: string) => api.get(`/api/reviews/user/${userId || 'me'}`),
  create: (data: Record<string, unknown>) => api.post('/api/reviews', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/reviews/${id}`, data),
  delete: (id: string) => api.delete(`/api/reviews/${id}`),
  approve: (id: string) => api.post(`/api/reviews/${id}/approve`),
  reject: (id: string) => api.post(`/api/reviews/${id}/reject`),
  getStats: () => api.get('/api/reviews/stats'),
  getRecent: (limit: number = 5) => api.get(`/api/reviews/recent?limit=${limit}`),
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

export const collaboratorProfileAPI = {
  // Obter perfil do colaborador atual
  getMyProfile: () => api.get('/api/collaborators/me/profile'),
  
  // Atualizar perfil do colaborador
  updateProfile: (data: Record<string, unknown>) => api.put('/api/collaborators/me/profile', data),
  
  // Upload de avatar
  uploadAvatar: (formData: FormData) => api.post('/api/collaborators/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  
  // Obter portfólio do colaborador
  getPortfolio: () => api.get('/api/collaborators/me/portfolio'),
  
  // Adicionar item ao portfólio
  addPortfolioItem: (data: Record<string, unknown>) => api.post('/api/collaborators/me/portfolio', data),
  
  // Atualizar item do portfólio
  updatePortfolioItem: (id: string, data: Record<string, unknown>) => 
    api.put(`/api/collaborators/me/portfolio/${id}`, data),
  
  // Remover item do portfólio
  deletePortfolioItem: (id: string) => api.delete(`/api/collaborators/me/portfolio/${id}`),
  
  // Upload de imagem do portfólio
  uploadPortfolioImage: (id: string, formData: FormData) => 
    api.post(`/api/collaborators/me/portfolio/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  // Obter configurações do colaborador
  getSettings: () => api.get('/api/collaborators/me/settings'),
  
  // Atualizar configurações
  updateSettings: (data: Record<string, unknown>) => api.put('/api/collaborators/me/settings', data),
  
  // Obter estatísticas do colaborador
  getStats: () => api.get('/api/collaborators/me/stats'),
  
  // Obter disponibilidade
  getAvailability: () => api.get('/api/collaborators/me/availability'),
  
  // Atualizar disponibilidade
  updateAvailability: (data: Record<string, unknown>) => api.put('/api/collaborators/me/availability', data),
  
  // Obter avaliações recebidas
  getReviews: (page?: number, limit?: number) => 
    api.get(`/api/collaborators/me/reviews?page=${page || 1}&limit=${limit || 10}`),
  
  // Responder a uma avaliação
  respondToReview: (reviewId: string, response: string) => 
    api.post(`/api/collaborators/me/reviews/${reviewId}/respond`, { response }),
};

// ✅ API DE MENSAGENS PARA COLABORADORES
export const collaboratorMessagesAPI = {
  // Obter chats do colaborador
  getMyChats: () => api.get('/collaborator/messages/chats'),
  
  // Criar chat de suporte
  createSupportChat: () => api.post('/collaborator/messages/chats/support'),
  
  // Obter mensagens de um chat
  getChatMessages: (chatId: string, page?: number, limit?: number) => 
    api.get(`/collaborator/messages/chats/${chatId}/messages?page=${page || 1}&limit=${limit || 20}`),
  
  // Enviar mensagem
  sendMessage: (chatId: string, content: string, messageType?: string) => 
    api.post(`/collaborator/messages/chats/${chatId}/messages`, { content, messageType: messageType || 'TEXT' }),
};
