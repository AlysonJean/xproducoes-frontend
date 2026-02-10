import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { logDebug } from '../utils/logger';
import { secureStorage } from '../utils/secureStorage';
import { normalizeString } from '../utils/string';
import { API_BASE_URL, API_URL } from '../utils/apiConfig';

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
  withCredentials: true, // Importante: envia cookies httpOnly automaticamente
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

import { authService } from './auth.service';

// ✅ CIRCUIT BREAKER REMOVED - HANDLED BY AUTH SERVICE QUEUING

// ✅ SECURE RESPONSE INTERCEPTOR WITH AUTO REFRESH
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: any) => {
    const originalRequest = error.config;

    // Se erro 401 e ainda não tentamos o retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await authService.refreshToken();
        
        if (newAccessToken) {
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        logDebug('Retry after refresh failed', { refreshError });
      }

      // Se falhou o refresh, o authService já tratou o logout
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
    // Add timeout handling
    const timeout = parseInt((import.meta as any).env?.VITE_API_TIMEOUT as string) || 30000;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    config.signal = controller.signal;

    try {
      const response = await fetch(url, config);
      clearTimeout(id);

      // If 401, try to refresh token and retry using global authService
      if (response.status === 401) {
        const newAccessToken = await authService.refreshToken();
        if (newAccessToken) {
          // Update headers for retry
          const retryHeaders = {
            ...(config.headers as Record<string, string>),
            Authorization: `Bearer ${newAccessToken}`,
          };
          
          // Create new controller for retry
          const retryController = new AbortController();
          const retryId = setTimeout(() => retryController.abort(), timeout);
          
          const retryResponse = await fetch(url, {
            ...config,
            headers: retryHeaders,
            signal: retryController.signal,
          });
          
          clearTimeout(retryId);
          return retryResponse;
        }
      }
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
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

  // Retry logic para falhas de rede transitórias
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 300; // inicial, exponencial
  let attempt = 0;
  let lastError: any = null;
  let response: Response | null = null;

  while (attempt < MAX_RETRIES) {
    try {
      response = await makeRequest(url, config);
      break;
    } catch (err: any) {
      lastError = err;
      // Só retry em erros de rede (ex.: TypeError: Failed to fetch)
      if (err instanceof TypeError || (err && /failed to fetch|network error/i.test(String(err.message || err)))) {
        attempt++;
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      // Erro não-retryável
      throw err;
    }
  }

  if (!response) {
    // Rejeta com última mensagem
    throw lastError || new Error('Network request failed');
  }

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

  if (response.status === 204) {
    return {} as T;
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
  invite: (email: string) => api.post('/collaborators/invite', { email }),
  // Dashboard pessoal do colaborador
  getMyDashboard: () => api.get('/collaborators/me/dashboard'),

  // Meus pagamentos
  getMyPayments: () => api.get('/collaborators/me/payments'),

  // Buscar colaboradores disponíveis na data
  getAvailable: (date: string, role?: string) => api.get('/admin/collaborators/available', { params: { date, role } }),
};

export const collaboratorFunctionsAPI = {
  getAll: () => api.get('/collaborator-functions'),
  getById: (id: string) => api.get(`/collaborator-functions/${id}`),
  create: (data: { name: string; description?: string }) => api.post('/collaborator-functions', data),
  update: (id: string, data: { name?: string; description?: string; active?: boolean }) => api.put(`/collaborator-functions/${id}`, data),
  delete: (id: string) => api.delete(`/collaborator-functions/${id}`),
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

export const collaboratorProfileAPI = {
  // Obter perfil do colaborador atual
  getMyProfile: () => api.get('/collaborators/me/profile'),

  // Atualizar perfil do colaborador
  updateProfile: (data: Record<string, unknown>) => api.put('/collaborators/me/profile', data),

  // Upload de avatar
  uploadAvatar: (formData: FormData) => api.post('/upload/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // Obter portfólio do colaborador
  getPortfolio: () => api.get('/collaborators/me/portfolio'),

  // Adicionar item ao portfólio
  addPortfolioItem: (data: Record<string, unknown>) => api.post('/collaborators/me/portfolio', data),

  // Atualizar item do portfólio
  updatePortfolioItem: (id: string, data: Record<string, unknown>) =>
    api.put(`/collaborators/me/portfolio/${id}`, data),

  // Remover item do portfólio
  deletePortfolioItem: (id: string) => api.delete(`/collaborators/me/portfolio/${id}`),

  // Upload de imagem do portfólio
  uploadPortfolioImage: (id: string, formData: FormData) =>
    api.post(`/collaborators/me/portfolio/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Obter configurações do colaborador
  getSettings: () => api.get('/collaborators/me/settings'),

  // Atualizar configurações
  updateSettings: (data: Record<string, unknown>) => api.put('/collaborators/me/settings', data),

  // Obter estatísticas do colaborador
  getStats: () => api.get('/collaborators/me/stats'),

  // Obter todos os eventos do colaborador
  getMyEvents: () => api.get('/collaborators/me/events'),

  // Obter notificações do colaborador
  getMyNotifications: () => api.get('/collaborators/me/notifications'),

  // Obter disponibilidade
  getAvailability: () => api.get('/collaborators/me/availability'),

  // Atualizar disponibilidade
  updateAvailability: (data: Record<string, unknown>) => api.put('/collaborators/me/availability', data),

  // Obter avaliações recebidas
  getReviews: (page?: number, limit?: number) =>
    api.get(`/collaborators/me/reviews?page=${page || 1}&limit=${limit || 10}`),

  // Responder a uma avaliação
  respondToReview: (reviewId: string, response: string) =>
    api.post(`/collaborators/me/reviews/${reviewId}/respond`, { response }),
};

// ✅ RECOMMENDATION ENGINE API
export const recommendationAPI = {
  // Recomendações personalizadas baseadas no histórico do usuário
  getPersonalized: (limit: number = 8) =>
    api.get(`/recommendations/personalized?limit=${limit}`),

  // Produtos similares a um equipamento/kit específico
  getSimilar: (id: string, type: 'equipment' | 'kit' | 'service' = 'equipment', limit: number = 4) =>
    api.get(`/recommendations/similar/${type}/${id}?limit=${limit}`),

  // Frequentemente reservados juntos
  getFrequentlyBought: (id: string, type: 'equipment' | 'kit' | 'service' = 'equipment', limit: number = 4) =>
    api.get(`/recommendations/frequently-bought/${type}/${id}?limit=${limit}`),

  // Trending/Popular agora
  getTrending: (limit: number = 8, category?: string) =>
    api.get(`/recommendations/trending?limit=${limit}${category ? `&category=${category}` : ''}`),

  // Novos produtos
  getNew: (limit: number = 8, category?: string) =>
    api.get(`/recommendations/new?limit=${limit}${category ? `&category=${category}` : ''}`),

  // Recomendações sazonais
  getSeasonal: (limit: number = 8) =>
    api.get(`/recommendations/seasonal?limit=${limit}`),

  // Baseado em favoritos do usuário
  getBasedOnFavorites: (limit: number = 8) =>
    api.get(`/recommendations/based-on-favorites?limit=${limit}`),

  // Completar o setup (kits complementares)
  getComplementary: (items: string[], limit: number = 4) =>
    api.post('/recommendations/complementary', { items, limit }),

  // Recomendações para categoria específica
  getByCategory: (categoryId: string, limit: number = 8) =>
    api.get(`/recommendations/category/${categoryId}?limit=${limit}`),

  // Recomendações baseadas em orçamento
  getByBudget: (minPrice: number, maxPrice: number, limit: number = 8) =>
    api.get(`/recommendations/budget?min=${minPrice}&max=${maxPrice}&limit=${limit}`),
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
