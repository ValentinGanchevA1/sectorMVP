// src/services/api.ts - PRODUCTION READY VERSION
import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import { store } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { errorHandler, ErrorCodes } from './errorHandler';
import { AppConfig } from '../config/app';

interface ApiResponse<T = any> {
data: T;
message?: string;
success: boolean;
meta?: {
page?: number;
limit?: number;
total?: number;
};
}

interface RefreshTokenResponse {
token: string;
refreshToken?: string;
}

interface QueuedRequest {
resolve: (value?: any) => void;
  reject: (error?: any) => void;
}

class ApiClient {
  private readonly client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: QueuedRequest[] = [];
  private requestMap = new Map<string, Promise<any>>();

  constructor() {
    this.client = axios.create({
      baseURL: AppConfig.API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = store.getState().auth.token;
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        const requestId = this.generateRequestId(config);
        if (config.headers) {
          config.headers['X-Request-ID'] = requestId;
        }

        if (config.headers) {
          config.headers['X-Request-Time'] = Date.now().toString();
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        return {
          ...response,
          data: response.data.data !== undefined ? response.data.data : response.data,
        } as AxiosResponse;
      },
      async (error: AxiosError) => {
        return this.handleResponseError(error);
      }
    );
  }

  private async handleResponseError(error: AxiosError): Promise<any> {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (!error.response) {
      const handledError = errorHandler.handleError(
        { code: ErrorCodes.NETWORK_ERROR, message: 'Network error. Please check your connection.' },
        'API Network'
      );
      return Promise.reject(handledError);
    }

    if (error.response.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/refresh')) {
        store.dispatch(logout());
        return Promise.reject(error);
      }
      return this.handleTokenRefresh(originalRequest, error);
    }

    if (error.response.status === 403) {
      const handledError = errorHandler.handleError(
        { code: ErrorCodes.AUTH_ERROR, message: 'Access denied' },
        'API Forbidden'
      );
      return Promise.reject(handledError);
    }

    if (error.response.status === 429) {
      const handledError = errorHandler.handleError(
        { code: ErrorCodes.NETWORK_ERROR, message: 'Too many requests. Please try again later.' },
        'API Rate Limit'
      );
      return Promise.reject(handledError);
    }

    if (error.response.status >= 500) {
      const handledError = errorHandler.handleError(
        { code: ErrorCodes.NETWORK_ERROR, message: 'Server error. Please try again.' },
        'API Server Error'
      );
      return Promise.reject(handledError);
    }

    const handledError = errorHandler.handleError(error, 'API Response');
    return Promise.reject(handledError);
  }

  private async handleTokenRefresh(
    originalRequest: AxiosRequestConfig & { _retry?: boolean },
    error: AxiosError
  ): Promise<any> {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      }).then(() => this.client(originalRequest))
        .catch(err => Promise.reject(err));
    }

    originalRequest._retry = true;
    this.isRefreshing = true;

    try {
      await this.refreshToken();
      this.processQueue(null);
      return this.client(originalRequest);
    } catch (refreshError) {
      this.processQueue(refreshError);
      store.dispatch(logout());
      return Promise.reject(refreshError);
    } finally {
      this.isRefreshing = false;
    }
  }

  private async refreshToken(): Promise<void> {
    try {
      const response = await axios.post<RefreshTokenResponse>(
        `${AppConfig.API_BASE_URL}/auth/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${store.getState().auth.token}`,
          },
        }
      );
    } catch (error) {
      throw error;
    }
  }

  private processQueue(error: any): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });

    this.failedQueue = [];
  }

  private generateRequestId(config: AxiosRequestConfig): string {
    const method = config.method || 'get';
    const url = config.url || '';
    const params = JSON.stringify(config.params || {});
    return `${method}-${url}-${params}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Deduplicate identical simultaneous requests
   */
  private async deduplicateRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    if (this.requestMap.has(key)) {
      console.log('[API] Deduplicating request:', key);
      return this.requestMap.get(key)!;
    }

    const promise = requestFn().finally(() => {
      this.requestMap.delete(key);
    });

    this.requestMap.set(key, promise);
    return promise;
  }

  // Public API Methods
  public async get<T = any>(
    url: string,
    params?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    try {
      const requestKey = `GET-${url}-${JSON.stringify(params)}`;
      return await this.deduplicateRequest(requestKey, () =>
        this.client.get<T>(url, { ...config, params })
      );
    } catch (error) {
      throw error;
    }
  }

  public async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.client.post<T>(url, data, config);
    } catch (error) {
      throw error;
    }
  }

  public async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.client.put<T>(url, data, config);
    } catch (error) {
      throw error;
    }
  }

  public async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.client.patch<T>(url, data, config);
    } catch (error) {
      throw error;
    }
  }

  public async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.client.delete<T>(url, config);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload files with multipart/form-data
   */
  public async uploadFile<T = any>(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.client.post<T>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(progress);
          }
        },
      });
    } catch (error) {
      throw error;
    }
  }

  public cancelAllRequests(): void {
    this.requestMap.clear();
  }

  public getBaseUrl(): string {
    return this.client.defaults.baseURL || '';
  }

  public setBaseUrl(baseUrl: string): void {
    this.client.defaults.baseURL = baseUrl;
  }
}

// Singleton instance
export const apiClient = new ApiClient();
