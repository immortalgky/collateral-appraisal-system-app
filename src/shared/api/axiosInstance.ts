import axios, { AxiosHeaders, type AxiosError } from 'axios';
import { queryClient } from '@app/queryClient';
import { extractApiError } from '../utils/errorUtils';
import type { ProblemDetails } from '../types/api';

// Development delay for seeing loading states (in milliseconds)
const DEV_API_DELAY = Number(import.meta.env.VITE_API_DELAY) || 0;

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Memory-only access token ---
let accessToken: string | null = null;

// --- BroadcastChannel for multi-tab sync (feature-detected) ---
type AuthChannelMessage =
  | { type: 'token_update'; token: string | null }
  | { type: 'logout' };

type AuthChannel = {
  postMessage: (message: AuthChannelMessage) => void;
  addEventListener: (
    type: 'message',
    listener: (event: { data?: AuthChannelMessage }) => void,
  ) => void;
};

const authChannel: AuthChannel =
  typeof globalThis !== 'undefined' && typeof globalThis.BroadcastChannel === 'function'
    ? new globalThis.BroadcastChannel('auth')
    : {
        postMessage: () => {},
        addEventListener: () => {},
      };

authChannel.addEventListener('message', event => {
  if (event.data?.type === 'token_update') {
    accessToken = event.data.token;
  }
  if (event.data?.type === 'logout') {
    accessToken = null;
    queryClient.clear();
    window.location.href = '/login';
  }
});

export function setAccessToken(token: string | null) {
  accessToken = token;
  // Broadcast to other tabs
  authChannel.postMessage({ type: 'token_update', token });
}

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Broadcast an explicit logout to other tabs so they clear their auth state
 * and redirect to /login. Use this (not setAccessToken(null)) when the user
 * initiates sign-out.
 */
export function broadcastLogout() {
  accessToken = null;
  authChannel.postMessage({ type: 'logout' });
}

// Endpoints that must NOT trigger a silent refresh-and-retry on 401.
// A 401 from /auth/login means bad credentials; a 401 from /auth/refresh
// means the refresh cookie is invalid — retrying would loop.
const AUTH_ENDPOINT_PATTERNS = [/\/auth\/login\b/, /\/auth\/refresh\b/, /\/auth\/token\b/];

function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  return AUTH_ENDPOINT_PATTERNS.some(re => re.test(url));
}

// --- Separate axios instance for refresh calls (with cookies) ---
export const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// --- Refresh queue pattern ---
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await refreshClient.post('/auth/refresh');
    return data.accessToken ?? null;
  } catch {
    return null;
  }
}

// Create axios instance with base URL and default headers
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 1000 * 10,
});

// Add request interceptor for authentication
axiosInstance.interceptors.request.use(
  config => {
    if (accessToken) {
      if (!config.headers) {
        config.headers = new AxiosHeaders();
      }
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Add response interceptor for error handling and dev delay
axiosInstance.interceptors.response.use(
  async response => {
    // Add delay for development to see loading states
    if (DEV_API_DELAY > 0) {
      await delay(DEV_API_DELAY);
    }
    return response;
  },
  async (error: AxiosError<ProblemDetails>) => {
    const { response, config } = error;

    // Handle 401 — attempt silent refresh.
    // Skip refresh entirely for auth endpoints: a 401 from /auth/login is a
    // credential failure (not a stale token) and refresh/token endpoints
    // would loop or mask the real error.
    if (
      response &&
      response.status === 401 &&
      config &&
      !isAuthEndpoint(config.url)
    ) {
      // Only attempt refresh once per request
      if ((config as any)._retried) {
        broadcastLogout();
        queryClient.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      (config as any)._retried = true;

      // Queue pattern: reuse in-flight refresh promise
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;

      if (newToken) {
        setAccessToken(newToken);
        if (!config.headers) {
        config.headers = new AxiosHeaders();
      }
        config.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(config);
      }

      // Refresh failed — force logout across tabs
      broadcastLogout();
      queryClient.clear();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Extract ProblemDetails and attach to error for consumers
    const apiError = extractApiError(error);
    (error as AxiosError & { apiError: typeof apiError }).apiError = apiError;

    return Promise.reject(error);
  },
);

export default axiosInstance;
