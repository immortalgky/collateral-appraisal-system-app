import axios, { type AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { redirectToLogin } from '@features/auth/utils/auth';
import { REDIRECT_SETTLE_MS } from './forcedNavigation';
import { isUserDriven, recordUserRequest } from './userActivity';
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

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Let a 401 reach the caller instead of sending the browser to the login page. */
    skipAuthRedirect?: boolean;
  }
}

// Create axios instance with base URL and default headers
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 1000 * 10,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(config => {
  // Timer-driven traffic must not keep the session alive; see userActivity.ts for the rule.
  if (isUserDriven()) {
    recordUserRequest();
  } else {
    config.headers.set('X-Background-Request', '1');
  }
  return config;
});

// Several requests in flight usually fail together when the session ends; send the browser once.
let redirectingToLogin = false;
// Set while the user is signing out, whose own navigation a racing 401 must not replace.
let loginRedirectSuspended = false;

export function suspendLoginRedirect(suspended: boolean) {
  loginRedirectSuspended = suspended;
}

// The API answers every endpoint with this 403 once the session owes a password change (see the
// API's MustChangePasswordMiddleware); no other 403 carries this title.
const PASSWORD_CHANGE_REQUIRED_TITLE = 'Password change required';

// A blob request (a PDF download) gets its error body as a Blob; read it to find the title.
const errorTitle = async (data: unknown): Promise<unknown> => {
  try {
    const body = data instanceof Blob ? JSON.parse(await data.text()) : data;
    return (body as ProblemDetails | undefined)?.title;
  } catch {
    return undefined;
  }
};

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

    // Extract ProblemDetails and attach to error for consumers
    const apiError = extractApiError(error);
    (error as AxiosError & { apiError: typeof apiError }).apiError = apiError;

    // The session is gone (expired, revoked, or never there): start a fresh sign-in and come back
    // to this page. The API answers 401, never a redirect, so this is the only place that decides.
    if (response?.status === 401 && !config?.skipAuthRedirect) {
      if (!redirectingToLogin && !loginRedirectSuspended) {
        redirectingToLogin = true;
        redirectToLogin();
        // The navigation is forced (no "Leave site?" prompt), so a page that is really leaving never
        // runs this; one whose navigation silently failed must not swallow every later 401.
        setTimeout(() => {
          redirectingToLogin = false;
        }, REDIRECT_SETTLE_MS);
      }
      return Promise.reject(error);
    }

    // The session became must-change-password after the page loaded: re-read /auth/me so
    // ProtectedRoute shows the forced password change. Imported lazily: auth/api imports this file.
    if (
      response?.status === 403 &&
      (await errorTitle(response.data)) === PASSWORD_CHANGE_REQUIRED_TITLE
    ) {
      void import('@features/auth/api')
        .then(({ refreshCurrentUser }) => refreshCurrentUser())
        .catch(() => {});
    }

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
