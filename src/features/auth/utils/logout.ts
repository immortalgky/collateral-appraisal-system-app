import toast from 'react-hot-toast';
import i18n from '@/i18n';
import axios, { suspendLoginRedirect } from '@shared/api/axiosInstance';
import { leaveWithoutPrompt, REDIRECT_SETTLE_MS } from '@shared/api/forcedNavigation';
import { queryClient } from '@app/queryClient';
import * as appHub from '@shared/realtime/appHub';

import { useAuthStore } from '../store';
import { authChannel } from './authChannel';

/** Tell the other tabs which user this browser's session cookie belongs to. */
export function announceUser(id: string) {
  authChannel?.postMessage({ type: 'user', id });
}

/**
 * React to the other tabs: navigate to /login when one signs out, and reload when one signs in as
 * a different user (the browser has one session cookie, so this tab's next save would run as them).
 * Returns the unsubscribe function.
 */
export function listenForRemoteLogout(): () => void {
  if (!authChannel) return () => {};
  const onMessage = (event: MessageEvent<{ type?: string; id?: string }>) => {
    if (event.data?.type === 'user') {
      const mine = useAuthStore.getState().user?.id;
      if (mine && event.data.id !== mine) leaveWithoutPrompt(() => window.location.reload());
      return;
    }
    if (event.data?.type !== 'logout') return;
    queryClient.clear();
    leaveWithoutPrompt(() => (window.location.href = '/login'));
  };
  authChannel.addEventListener('message', onMessage);
  return () => authChannel?.removeEventListener('message', onMessage);
}

/** Resolves when `promise` settles or after `ms`, whichever comes first; never rejects. */
const settleWithin = (promise: Promise<unknown>, ms: number) =>
  new Promise<void>(resolve => {
    const timer = setTimeout(resolve, ms);
    promise
      .catch(() => {})
      .finally(() => {
        clearTimeout(timer);
        resolve();
      });
  });

// The sign-out in progress (or just completed, until the page has had time to leave), so a double
// click or a second caller joins it instead of starting another.
let current: Promise<void> | null = null;

/**
 * Ends the server session, then lets the API send the browser through the identity provider's
 * end-session page (which clears its own SSO cookie) and back to the SPA.
 *
 * The API answers 200 `{ url }` even when the session is already gone, so this is called directly,
 * never gated on /auth/me. Anything else means the session may still be alive, so nothing is torn
 * down: the user stays signed in, is told, and can try again.
 *
 * Navigates without touching the auth store: clearing it would make ProtectedRoute redirect to
 * /login and cancel the navigation to the identity provider.
 */
export function logout(): Promise<void> {
  return (current ??= signOut());
}

async function signOut(): Promise<void> {
  let destination = '/login';
  // Whatever 401 races this request, or the slower hop through the identity provider that follows
  // (a poll, the hub's session check), must not replace that navigation with a sign-in redirect.
  suspendLoginRedirect(true);
  try {
    // skipAuthRedirect: a stray 401 must never hijack the sign-out into a sign-in redirect.
    const { data } = await axios.post<{ url?: unknown }>('/auth/logout', undefined, {
      skipAuthRedirect: true,
    });
    if (typeof data?.url === 'string' && data.url) destination = data.url;
  } catch {
    // Still signed in and nothing was torn down (the hub keeps its connection and groups).
    suspendLoginRedirect(false);
    current = null;
    toast.error(i18n.t('auth:logout.failed'));
    return;
  }
  // The session is gone: stop the hub so it does not reconnect during the unload window, but never
  // let a slow stop hold the sign-out.
  await settleWithin(appHub.stop(), REDIRECT_SETTLE_MS);
  authChannel?.postMessage({ type: 'logout' });
  queryClient.clear();
  sessionStorage.clear();
  window.location.replace(destination);
  // Held while the page leaves. If it is still here (a cancelled "Leave site?" prompt) the server
  // session is gone anyway, so let the next 401 send the user to sign in.
  setTimeout(() => {
    suspendLoginRedirect(false);
    current = null;
  }, REDIRECT_SETTLE_MS);
}
