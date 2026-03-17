/**
 * 🔧 API Configuration
 * Centralizes API URL configuration to avoid duplication across the application.
 */

/**
 * Returns the base URL for the API (including /api/v1 suffix)
 */
export function getApiBaseUrl(): string {
  // Production: use same-origin proxy (Vercel rewrites /api/v1/* to Render)
  // This enables sameSite:'lax' cookies and eliminates CORS overhead
  if (import.meta.env.MODE === 'production') {
    const value = import.meta.env.VITE_API_BASE_URL;
    if (value) {
      return value.endsWith('/') ? value.slice(0, -1) : value;
    }
    // Same-origin: Vercel proxy handles forwarding to Render backend
    return '/api/v1';
  }

  // Smart fallback based on hostname (covers Vercel preview deploys)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'xproducoeseeventos.com.br' || hostname === 'www.xproducoeseeventos.com.br') {
      return '/api/v1';
    }
  }

  // Development fallback
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }

  return 'http://localhost:4000/api/v1';
}

/**
 * Returns the root API URL (without /api/v1 suffix)
 */
export function getApiRootUrl(): string {
  // Production: same-origin via Vercel proxy
  if (import.meta.env.MODE === 'production') {
    const value = import.meta.env.VITE_API_URL;
    if (value) {
      return value.endsWith('/') ? value.slice(0, -1) : value;
    }
    return '';
  }

  // Smart fallback based on hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'xproducoeseeventos.com.br' || hostname === 'www.xproducoeseeventos.com.br') {
      return '';
    }
  }

  // Development fallback
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }

  return 'http://localhost:4000';
}

/**
 * Returns the direct backend URL for WebSocket connections.
 * WebSockets cannot be proxied via Vercel rewrites — they need the real backend host.
 */
export function getSocketUrl(): string {
  if (import.meta.env.MODE === 'production') {
    return import.meta.env.VITE_SOCKET_URL || 'https://xproducoes-backend.onrender.com';
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'xproducoeseeventos.com.br' || hostname === 'www.xproducoeseeventos.com.br') {
      return 'https://xproducoes-backend.onrender.com';
    }
  }

  return import.meta.env.VITE_API_URL || 'http://localhost:4000';
}

// Pre-computed URLs for direct access
export const API_BASE_URL = getApiBaseUrl();
export const API_URL = getApiRootUrl();
export const SOCKET_URL = getSocketUrl();
