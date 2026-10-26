import toast from 'react-hot-toast';
import i18n from '@/i18n';
import axios, { suspendLoginRedirect } from '@shared/api/axiosInstance';
import { REDIRECT_SETTLE_MS } from '@shared/api/forcedNavigation';
import { queryClient } from '@app/queryClient';
import * as appHub from '@shared/realtime/appHub';

import { useAuthStore } from '../store';
import { authChannel } from './authChannel';
import { goHomeAsNewUser, redirectToLogin, session, SIGNED_OUT_KEY } from './auth';

/** Tell the other tabs which user this browser's session cookie belongs to. */
export function announceUser(id: string) {
  authChannel?.postMessage({ type: 'user', id });
}

/**
 * React to the other tabs: navigate to /login when one signs out, and go home when one signs in as
 * a different user (the browser has one session cookie, so this tab's next save would run as them).
 * Returns the unsubscribe function.
 */
export function listenForRemoteLogout(): () => void {
  if (!authChannel) return () => {};
  const onMessage = (event: MessageEvent<{ type?: string; id?: string }>) => {
    if (event.data?.type === 'user') {
      const mine = useAuthStore.getState().user?.id;
      if (mine && event.data.id !== mine) goHomeAsNewUser();
      return;
    }
    if (event.data?.type !== 'logout') return;
    queryClient.clear();
    // Explicit sign-out on a possibly shared computer: say so, but keep no page for the next person.
    // Does nothing on the sign-in page itself.
    redirectToLogin(null, 'signed-out');
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
let current: Promise<boolean> | null = null;

/**
 * Ends the server session, then lets the API send the browser through the identity provider's
 * end-session page (which clears its own SSO cookie) and back to the SPA.
 *
 * The API answers 200 `{ url }` even when the session is already gone, so this is called directly,
 * never gated on /auth/me. Anything else means the session may still be alive, so nothing is torn
 * down: the user stays signed in, is told, and can try again.
 *
 * Resolves true when it signed out (the page is on its way to leave; if the navigation threw, a
 * best-effort redirect to the sign-in page is tried instead), false when it did not.
 *
 * Navigates without touching the auth store: clearing it would make ProtectedRoute redirect to
 * /login and cancel the navigation to the identity provider.
 */
export function logout(): Promise<boolean> {
  return (current ??= signOut());
}

async function signOut(): Promise<boolean> {
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
    return false;
  }
  try {
    // The session is gone: stop the hub so it does not reconnect during the unload window, but never
    // let a slow stop hold the sign-out.
    await settleWithin(appHub.stop(), REDIRECT_SETTLE_MS);
    authChannel?.postMessage({ type: 'logout' });
    queryClient.clear();
    session.clear();
    // Read once by the sign-in page this lands on, to say "you signed out" rather than the first-visit text.
    session.set(SIGNED_OUT_KEY, '1');
    window.location.replace(destination);
    return true;
  } catch {
    // The session is gone on the server, so the sign-out happened: a throw here (a blocked
    // navigation, say) must not strand the caller. Best effort to reach the sign-in page.
    session.clear(); // as on the way out above: nothing of this user's tab state survives
    try {
      redirectToLogin(null, 'signed-out');
    } catch {
      // nothing more to try; the next 401 sends the user there
    }
    return true;
  } finally {
    // Held while the page leaves, also if a step above threw. If the page is still here (a cancelled
    // "Leave site?" prompt) the server session is gone anyway, so let the next 401 send the user to
    // sign in.
    setTimeout(() => {
      suspendLoginRedirect(false);
      current = null;
    }, REDIRECT_SETTLE_MS);
  }
}
