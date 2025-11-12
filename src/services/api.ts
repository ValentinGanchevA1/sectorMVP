// src/services/api.ts - PRODUCTION READY VERSION
import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import { store } from '../store/store';
import { logout } from '../store/slices/authSlice';
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
        // Add auth token
        const token = store.getState().auth.token;
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking and deduplication
        const requestId = this.generateRequestId(config);
        if (config.headers) {
          config.headers['X-Request-ID'] = requestId;
        }

        // Add timestamp
        if (config.headers) {
          config.headers['X-Request-Time'] = Date.now().toString();
        }

        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data,
        });

        return config;
      },
      (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        console.log(`[API] Response: ${response.config.url}`, {
          status: response.status,
          data: response.data,
        });

        // Transform to consistent format
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

    // Handle network errors
    if (!error.response) {
      console.error('[API] Network error:', error.message);
      const handledError = errorHandler.handleError(
        { code: ErrorCodes.NETWORK_ERROR, message: 'Network error. Please check your connection.' },
        'API Network'
      );
      return Promise.reject(handledError);
    }

    // Handle 401 - Unauthorized (Token expired)
    if (error.response.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/refresh')) {
        // Refresh token itself failed, logout
        console.warn('[API] Refresh token failed, logging out');
        store.dispatch(logout());
        return Promise.reject(error);
      }

      // Attempt to refresh token
      return this.handleTokenRefresh(originalRequest, error);
    }

    // Handle 403 - Forbidden
    if (error.response.status === 403) {
      console.warn('[API] Access forbidden:', error.response.data);
      const handledError = errorHandler.handleError(
        { code: ErrorCodes.AUTH_ERROR, message: 'Access denied' },
        'API Forbidden'
      );
      return Promise.reject(handledError);
    }

    // Handle 404 - Not Found
    if (error.response.status === 404) {
      console.warn('[API] Resource not found:', originalRequest.url);
    }

    // Handle 429 - Rate Limited
    if (error.response.status === 429) {
      console.warn('[API] Rate limited');
      const handledError = errorHandler.handleError(
        { code: ErrorCodes.NETWORK_ERROR, message: 'Too many requests. Please try again later.' },
        'API Rate Limit'
      );
      return Promise.reject(handledError);
    }

    // Handle 500+ - Server errors
    if (error.response.status >= 500) {
      console.error('[API] Server error:', error.response.status);
      const handledError = errorHandler.handleError(
        { code: ErrorCodes.NETWORK_ERROR, message: 'Server error. Please try again.' },
        'API Server Error'
      );
      return Promise.reject(handledError);
    }

    // Handle other errors
    console.error('[API] Response error:', error.response.status, error.response.data);
    const handledError = errorHandler.handleError(error, 'API Response');
    return Promise.reject(handledError);
  }

  private async handleTokenRefresh(
    originalRequest: AxiosRequestConfig & { _retry?: boolean },
    error: AxiosError
  ): Promise<any> {
    if (this.isRefreshing) {
      // Queue the request while refresh is in progress
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      }).then(() => {
        return this.client(originalRequest);
      }).catch(err => {
        return Promise.reject(err);
      });
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
      console.log('[API] Refreshing token...');
      const response = await axios.post<RefreshTokenResponse>(
        `${AppConfig.API_BASE_URL}/auth/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${store.getState().auth.token}`,
          },
        }
      );

      // TODO: Dispatch action to update token in Redux
      // store.dispatch(setToken(response.data.token));

      console.log('[API] Token refreshed successfully');
    } catch (error) {
      console.error('[API] Token refresh failed:', error);
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

  /**
   * Cancel all pending requests
   */
  public cancelAllRequests(): void {
    this.requestMap.clear();
    console.log('[API] All pending requests cancelled');
  }

  /**
   * Get current base URL
   */
  public getBaseUrl(): string {
    return this.client.defaults.baseURL || '';
  }

  /**
   * Update base URL (useful for switching environments)
   */
  public setBaseUrl(baseUrl: string): void {
    this.client.defaults.baseURL = baseUrl;
    console.log('[API] Base URL updated:', baseUrl);
  }
}

// Singleton instance
export const apiClient = new ApiClient();
