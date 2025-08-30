// Axios HTTP Client Implementation - Following industry standards
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
// Removido import de pacote monorepo. Defina interfaces IHttpClient, IHttpResponse, IHttpRequestConfig em src/types/types.ts se necessário.
// import { logAPI, logError } from '../utils/logger'; // Removido, não existem

import type { HttpClient, HttpResponse, HttpRequestConfig } from '../types/types';
export class AxiosHttpClient implements HttpClient {
  private instance: AxiosInstance;

  constructor(baseURL: string, config?: { timeout?: number; headers?: Record<string, string> }) {
    this.instance = axios.create({
      baseURL,
      timeout: config?.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Add timestamp for debugging
        config.metadata = { startTime: Date.now() };
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for logging and error handling
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // ✅ PRODUCTION-SAFE API LOGGING
        // Logging removido: logAPI não existe
        return response;
      },
      (error: AxiosError) => {
        // ✅ PRODUCTION-SAFE ERROR LOGGING
        // Logging removido: logError não existe
        return Promise.reject(error);
      }
    );
  }

  private transformResponse<T>(response: AxiosResponse): HttpResponse<T> {
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
    };
  }

  async get<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const response = await this.instance.get(url, {
      params: config?.params,
      headers: config?.headers,
      timeout: config?.timeout,
    });
    return this.transformResponse<T>(response);
  }

  async post<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const response = await this.instance.post(url, data, {
      headers: config?.headers,
      timeout: config?.timeout,
    });
    return this.transformResponse<T>(response);
  }

  async put<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const response = await this.instance.put(url, data, {
      headers: config?.headers,
      timeout: config?.timeout,
    });
    return this.transformResponse<T>(response);
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    const response = await this.instance.patch(url, data, {
      headers: config?.headers,
      timeout: config?.timeout,
    });
    return this.transformResponse<T>(response);
  }

  async delete<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const response = await this.instance.delete(url, {
      headers: config?.headers,
      timeout: config?.timeout,
    });
    return this.transformResponse<T>(response);
  }

  // Additional utility methods
  async uploadFile<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<HttpResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.instance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return this.transformResponse<T>(response);
  }
}

// Axios configuration extensions
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
}
