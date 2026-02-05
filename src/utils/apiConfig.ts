/**
 * 🔧 API Configuration
 * Centralizes API URL configuration to avoid duplication across the application.
 */

/**
 * Returns the base URL for the API (including /api/v1 suffix)
 */
export function getApiBaseUrl(): string {
  // Production environment
  if (import.meta.env.MODE === 'production') {
    const value = import.meta.env.VITE_API_BASE_URL;
    if (value) {
      return value.endsWith('/') ? value.slice(0, -1) : value;
    }
    // Fallback for production if env var is missing
    return 'https://api.xproducoeseeventos.com.br/api/v1';
  }

  // Smart fallback based on hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'xproducoeseeventos.com.br' || hostname === 'www.xproducoeseeventos.com.br') {
      return 'https://api.xproducoeseeventos.com.br/api/v1';
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
  // Production environment
  if (import.meta.env.MODE === 'production') {
    const value = import.meta.env.VITE_API_URL;
    if (value) {
      return value.endsWith('/') ? value.slice(0, -1) : value;
    }
    return 'https://api.xproducoeseeventos.com.br';
  }

  // Smart fallback based on hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'xproducoeseeventos.com.br' || hostname === 'www.xproducoeseeventos.com.br') {
      return 'https://api.xproducoeseeventos.com.br';
    }
  }

  // Development fallback
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }

  return 'http://localhost:4000';
}

// Pre-computed URLs for direct access
export const API_BASE_URL = getApiBaseUrl();
export const API_URL = getApiRootUrl();
