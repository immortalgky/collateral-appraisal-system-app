import axios, { AxiosHeaders, type AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { queryClient } from '@app/queryClient';
import { extractApiError } from '../utils/errorUtils';
import type { ProblemDetails } from '../types/api';

/**
 * Known backend error detail fragments that map to a user-friendly message.
 * Checked against the 'detail' field of the ProblemDetails response.
 *
 * The followup gate pattern intentionally uses the word "followup" as a
 * distinctive anchor — this avoids false matches on unrelated messages that
 * contain "resolve" or "document" alone (e.g. "Please resolve the missing
 * document type for the comparables").
 *
 * Preferred upgrade path: ask the backend to add a stable `errorCode` field
 * to the ProblemDetails response (e.g. "OPEN_DOCUMENT_FOLLOWUP") so we can
 * match on a code rather than a localised string.
 */
const FRIENDLY_ERROR_MAP: Array<{ pattern: RegExp; message: string }> = [
  {
    // Matches any backend message that contains "followup" within 20 chars of "document".
    // Triggered when the document-followup gate blocks a task submission.
    pattern: /document.{0,20}followup/i,
    message: 'Resolve open document requests before submitting.',
  },
];

// Development delay for seeing loading states (in milliseconds)
const DEV_API_DELAY = Number(import.meta.env.VITE_API_DELAY) || 0;

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Memory-only access token ---
let accessToken: string | null = null;

// Set when /auth/refresh answers 401 — the refresh cookie is gone, expired, or revoked.
// Deliberately NOT set for a transient failure (offline, DNS, 5xx): those callers must keep
// retrying at full speed.
let sessionExpired = false;

/**
 * Whether reconnect loops should back off because refreshing looks hopeless: the last /auth/refresh
 * answered 401 and nothing since has produced a usable token.
 *
 * A hint, not a guarantee, and deliberately biased towards under-reporting:
 * - 401 also covers a token-rotation race between tabs, so consumers slow down rather than stop.
 * - It stays false while a clock-valid access token is being rejected server-side (revoked token,
 *   deleted user) — no refresh runs in that window, so nothing observes the rejection. Bounded by
 *   the access-token TTL, after which the next refresh reports the truth.
 * - The boot refresh in AuthInitializer calls the endpoint directly and does not feed this flag.
 *   By then no hub is running, and the flag is per-page-load state anyway.
 */
export function isSessionExpired(): boolean {
  return sessionExpired;
}

// --- BroadcastChannel for multi-tab sync (feature-detected) ---
type AuthChannelMessage = { type: 'token_update'; token: string | null } | { type: 'logout' };

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
    // Another tab signed in successfully, so this tab's session is alive again — un-stick any
    // reconnect loop that gave up here.
    if (event.data.token) sessionExpired = false;
  }
  if (event.data?.type === 'logout') {
    accessToken = null;
    queryClient.clear();
    window.location.href = '/login';
  }
});

export function setAccessToken(token: string | null) {
  accessToken = token;
  // A real token means we are authenticated again, whatever happened before.
  if (token) sessionExpired = false;
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
  // Without this a hung refresh leaves refreshPromise pending forever: accessTokenFactory never
  // resolves, the reconnect attempt stalls, and sessionExpired is never set — bypassing the
  // back-off entirely. Matches the main instance's timeout.
  timeout: 1000 * 10,
});

// --- Refresh queue pattern ---
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await refreshClient.post('/auth/refresh');
    // Clear here rather than leaving it to callers: the invariant consumers want is "the LAST
    // refresh attempt 401'd", not "some refresh 401'd at some point". Callers that reach for a
    // still-valid cached token never come through here, so relying on setAccessToken() alone
    // would let the flag outlive the condition it describes.
    sessionExpired = false;
    return data.accessToken ?? null;
  } catch (error) {
    // 401 is the server's definitive "this session is over" — the refresh cookie is missing,
    // expired, or revoked, and retrying can never succeed. Everything else (offline, DNS, 5xx)
    // may well recover, so leave the flag alone and let callers keep retrying.
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      sessionExpired = true;
    }
    return null;
  }
}

/**
 * Decode a JWT's `exp` (seconds since epoch) and report whether it is expired
 * (or expires within `skewSeconds`). Returns true on any decode failure so a
 * malformed/unparsable token is treated as needing a refresh. */
function isTokenExpired(token: string, skewSeconds = 30): boolean {
  try {
    const segment = token.split('.')[1];
    if (!segment) return true;
    // base64url → base64, restoring '=' padding to a multiple of 4.
    const b64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '==='.slice((b64.length + 3) % 4);
    const json = atob(padded);
    const exp = JSON.parse(json).exp as number | undefined;
    if (typeof exp !== 'number') return true;
    return Date.now() >= (exp - skewSeconds) * 1000;
  } catch {
    return true;
  }
}

/**
 * Return a usable access token, refreshing first if the in-memory token is
 * missing or (about to be) expired. Reuses the same single-flight refresh
 * promise as the 401 interceptor so concurrent callers share one refresh.
 *
 * Used by the SignalR accessTokenFactory so reconnects after idle/sleep don't
 * negotiate with a stale token and 401-loop.
 */
export async function getFreshAccessToken(): Promise<string | null> {
  if (accessToken && !isTokenExpired(accessToken)) {
    // Holding a usable token is itself evidence the session is alive, so clear the flag here too.
    // Without this it can stick: in a two-tab rotation race the loser's 401 can land *after* the
    // winner has already broadcast its fresh token, leaving this tab authenticated but backed off.
    // Every later call short-circuits on this branch, so nothing else would ever reset it.
    sessionExpired = false;
    return accessToken;
  }
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  const newToken = await refreshPromise;
  if (newToken) {
    setAccessToken(newToken);
  }
  return newToken;
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
    if (response && response.status === 401 && config && !isAuthEndpoint(config.url)) {
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

    // Map known backend gate-rejection errors to friendly toasts
    if (apiError.detail || apiError.title) {
      const errorText = `${apiError.detail ?? ''} ${apiError.title ?? ''}`;
      for (const entry of FRIENDLY_ERROR_MAP) {
        if (entry.pattern.test(errorText)) {
          toast.error(entry.message);
          break;
        }
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
