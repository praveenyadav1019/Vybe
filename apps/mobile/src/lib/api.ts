import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import * as SecureStore from 'expo-secure-store';

function hasLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export async function getStoredValue(key: string): Promise<string | null> {
  if (hasLocalStorage()) {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

export async function setStoredValue(key: string, value: string): Promise<void> {
  if (hasLocalStorage()) {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function deleteStoredValue(key: string): Promise<void> {
  if (hasLocalStorage()) {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

// Token storage keys
export const TOKEN_KEYS = {
  ACCESS: 'vybeon_access_token',
  REFRESH: 'vybeon_refresh_token',
  USER_ID: 'vybeon_user_id',
} as const;

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request: attach access token
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await getStoredValue(TOKEN_KEYS.ACCESS);
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response: handle 401 with token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await getStoredValue(TOKEN_KEYS.REFRESH);
            if (!refreshToken) throw new Error('No refresh token');

            const { data } = await axios.post(
              `${API_BASE_URL}/auth/refresh`,
              { refreshToken }
            );
            const newToken = data.accessToken as string;

            await setStoredValue(TOKEN_KEYS.ACCESS, newToken);
            this.refreshSubscribers.forEach((cb) => cb(newToken));
            this.refreshSubscribers = [];

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch {
            // Refresh failed — clear tokens; auth store handles navigation
            await this.clearTokens();
            return Promise.reject(error);
          } finally {
            this.isRefreshing = false;
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async saveTokens(accessToken: string, refreshToken: string) {
    await Promise.all([
      setStoredValue(TOKEN_KEYS.ACCESS, accessToken),
      setStoredValue(TOKEN_KEYS.REFRESH, refreshToken),
    ]);
  }

  async clearTokens() {
    await Promise.all([
      deleteStoredValue(TOKEN_KEYS.ACCESS),
      deleteStoredValue(TOKEN_KEYS.REFRESH),
      deleteStoredValue(TOKEN_KEYS.USER_ID),
    ]);
  }

  async getAccessToken(): Promise<string | null> {
    return getStoredValue(TOKEN_KEYS.ACCESS);
  }

  get<T>(url: string, params?: object) {
    return this.client.get<T>(url, { params });
  }

  post<T>(url: string, data?: object) {
    return this.client.post<T>(url, data);
  }

  patch<T>(url: string, data?: object) {
    return this.client.patch<T>(url, data);
  }

  delete<T>(url: string) {
    return this.client.delete<T>(url);
  }
}

export const api = new ApiClient();

// ─── Legacy fetch-based helper (kept for backward-compat) ───────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
  }
}

async function parseJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (init.token) headers.set('Authorization', `Bearer ${init.token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new ApiError('Request failed', res.status, body);
  }
  return body as T;
}
