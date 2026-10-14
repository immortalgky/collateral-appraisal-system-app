import { leaveWithoutPrompt } from '@shared/api/forcedNavigation';
import i18n from 'i18next';
import { useMenuStore } from '@features/menuManagement/store';
import type { MenuTreeNode } from '@features/menuManagement/types';
import { resolveLabel } from '@features/menuManagement/utils/label';
import { useAuthStore } from '../store';
import type { User } from '../types';

/** Why the user is on the sign-in page; none means a first visit. */
export type LoginReason = 'idle' | 'ended' | 'signed-out';

/** Set by logout() so the sign-in page it lands on can say "you signed out". */
export const SIGNED_OUT_KEY = 'cas-signed-out';
const RETURN_KEY = 'cas-return';

/**
 * `path` as a same-origin path+query+hash; anything that points elsewhere becomes `/`.
 *
 * Resolving dot-segments can leave `//host/...` (from `/.//host`), which a browser reads as another
 * origin when it is navigated to as a bare path, so that is rejected too.
 */
export function sameOriginPath(path: string, origin: string): string {
  try {
    const url = new URL(path, origin);
    const resolved = `${url.pathname}${url.search}${url.hash}`;
    return url.origin === origin && !/^[/\\]{2}/.test(resolved) ? resolved : '/';
  } catch {
    // A malformed address (an unclosed IPv6 bracket, a space in the host, a huge port) is not ours.
    return '/';
  }
}

// sessionStorage can throw (blocked storage, a full quota); none of it is worth failing a sign-in for.
export const session = {
  get(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* nothing to do */
    }
  },
  remove(key: string) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* nothing to do */
    }
  },
  clear() {
    try {
      sessionStorage.clear();
    } catch {
      /* nothing to do */
    }
  },
};

/**
 * The sign-in route, however the URL spells it: the router ignores case and a trailing slash, and
 * decodes the path before matching, so `/%6Cogin` is the same route.
 */
export const isLoginPath = (pathname: string) => {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // Not valid percent-encoding: the router would not match it as the login route either.
  }
  return /^\/login\/*$/i.test(path);
};

/**
 * Why a session ended, from the API's X-Session-End header on a 401. No header means there was no
 * session cookie to end (another tab just signed out, say), so claim nothing.
 */
export const sessionEndReason = (header: unknown): LoginReason | undefined =>
  header ? (header === 'idle' ? 'idle' : 'ended') : undefined;

const currentPath = () => {
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
};

/** The origin of VITE_APP_URL, or undefined when it is unset or malformed. */
const canonicalOrigin = () => {
  try {
    return new URL(import.meta.env.VITE_APP_URL).origin;
  } catch {
    return undefined;
  }
};

/**
 * The bare host name and the FQDN are cross-site to the API, so the Lax session cookie it sets
 * would not be sent back from the other one (and its CORS answers may not cover it). The server
 * always returns to VITE_APP_URL, so move to that origin first. Returns true when it navigated and
 * the caller should do nothing more.
 */
export function hopToCanonicalOrigin(returnPath?: string): boolean {
  const appOrigin = canonicalOrigin();
  if (!appOrigin) {
    // Unset or malformed: there is no canonical origin to hop to, and throwing here would brick boot.
    console.warn('VITE_APP_URL is not a valid URL; skipping the canonical-origin hop');
    return false;
  }
  if (window.location.origin === appOrigin) return false;
  const target = `${appOrigin}${sameOriginPath(returnPath ?? currentPath(), appOrigin)}`;
  leaveWithoutPrompt(() => window.location.replace(target));
  return true;
}

/**
 * Who was signed in when a session timed out, for the "Continue as" card. `displayName` is masked
 * (first name + first letter of the surname) because the sign-in page may be left on a shared screen.
 */
export type SavedAccount = { username: string; displayName: string; initials: string };

/** `userId` is who was signed in when the session ended, to tell a different user's sign-in apart. */
export type SavedReturn = {
  path?: string;
  label?: string;
  reason?: LoginReason;
  userId?: string;
  account?: SavedAccount;
  /**
   * Written by "Not you?" and by another tab's sign-out: there is no previous page to return to, so
   * the sign-in page ignores router state naming one.
   */
  notYou?: boolean;
};

/** The first letter that names a word: Thai leading vowels (เ แ โ ใ ไ) are written before the consonant. */
const firstLetter = (text?: string) => {
  const letters = Array.from(text?.trim() ?? '');
  return letters.find(c => !'เแโใไ'.includes(c)) ?? letters[0] ?? '';
};

/**
 * The signed-in user as the card shows them. Undefined without a username to hint or a first name
 * to show: a username is never displayed, it can be an employee id or an email.
 */
function accountOf(user: User | null): SavedAccount | undefined {
  const first = user?.firstName?.trim();
  if (!user?.username || !first) return undefined;
  const lastInitial = firstLetter(user.lastName).toUpperCase();
  return {
    username: user.username,
    displayName: lastInitial ? `${first} ${lastInitial}.` : first,
    initials: (firstLetter(first) + lastInitial).toUpperCase(),
  };
}

/**
 * The session cookie now belongs to someone else (another tab signed in): start this tab over at
 * the app home. A reload would leave the new user on the previous user's page.
 */
export function goHomeAsNewUser() {
  leaveWithoutPrompt(() =>
    window.location.replace(`${canonicalOrigin() ?? window.location.origin}/`),
  );
}

/** Is `id` the user whose session ended (`savedId`)? An unknown saved user counts as a match: carry on. */
export const isSavedUserOrUnknown = (savedId: string | undefined, id: string | undefined) =>
  !savedId || savedId === id;

/** Is `id` the user whose session ended? Only a known match counts (the other-tab auto return). */
export const isSavedUserStrict = (savedId: string | undefined, id: string | undefined) =>
  !!savedId && savedId === id;

/**
 * What redirectToLogin saved, so the sign-in page can restore it when its URL has lost the query
 * (the identity provider's "choose another method" link goes to a bare /login). Callers must still
 * validate `path` with safeReturnPath.
 */
export function readSavedReturn(): SavedReturn | undefined {
  try {
    const saved = JSON.parse(session.get(RETURN_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return undefined;
    const { username, displayName, initials } = saved.account ?? {};
    const valid =
      typeof username === 'string' &&
      typeof displayName === 'string' &&
      typeof initials === 'string';
    return { ...saved, account: valid ? { username, displayName, initials } : undefined };
  } catch {
    return undefined;
  }
}

/**
 * Remember what the sign-in page shows, for readSavedReturn. "Signed out" is one-shot (the flag
 * logout() leaves is consumed too), so it is not kept: a later bare /login must not say it again.
 */
export const saveReturn = (saved: SavedReturn) =>
  session.set(
    RETURN_KEY,
    JSON.stringify({ ...saved, reason: saved.reason === 'signed-out' ? undefined : saved.reason }),
  );

/** Forget the saved state once the user is signed in, so a later bare /login cannot resurrect it. */
export const clearSavedReturn = () => session.remove(RETURN_KEY);

/**
 * Where to come back to after signing in: a same-origin pathname, never /login itself. The query and
 * hash are dropped on purpose: a search box's text (a customer's name) would otherwise sit in the
 * address bar of a sign-in page that may be left on a shared computer.
 */
export function safeReturnPath(returnPath?: string): string {
  const [pathname] = sameOriginPath(returnPath ?? '/', window.location.origin).split(/[?#]/);
  return isLoginPath(pathname) ? '/' : pathname;
}

/**
 * The sidebar menu's name for the page at `path` (the item with the longest matching path), or ''
 * when no item matches. Deliberately the menu and nothing else: a record's number or name must not
 * reach a sign-in screen that may be left shared.
 */
function menuLabelFor(path: string): string {
  // Best effort: a malformed menu payload must not stop the redirect itself.
  try {
    const pathname = new URL(path, window.location.origin).pathname;
    let best: MenuTreeNode | undefined;
    let bestLength = 0;
    let bestPlain = false;
    // In menu order (a stack, so children go on reversed), so the first of equals wins.
    const stack = [...useMenuStore.getState().main].reverse();
    while (stack.length > 0) {
      const node = stack.pop()!;
      stack.push(...[...node.children].reverse());
      // A menu path may carry a query or a hash; only the pathname takes part in the match.
      const base = node.path?.split(/[?#]/)[0].replace(/\/+$/, '');
      if (!base || !(pathname === base || pathname.startsWith(`${base}/`))) continue;
      // Several items can share one pathname (/tasks, /tasks?activity=...): the plain one is the page.
      const plain = !/[?#]/.test(node.path!);
      if (base.length > bestLength || (base.length === bestLength && plain && !bestPlain)) {
        best = node;
        bestLength = base.length;
        bestPlain = plain;
      }
    }
    return best ? resolveLabel(best.labels, i18n.language) : '';
  } catch {
    return '';
  }
}

/**
 * Send the browser to the sign-in page (the SPA's /login), which says why and starts the real
 * sign-in only when the user clicks. Starting it here would create the identity provider's login
 * state at redirect time, and it expires if the page is left open.
 *
 * `returnPath` is where to land afterwards (a same-origin path); it defaults to the current
 * location. `null` means nowhere in particular (the home page): used when someone else signed out
 * on a shared computer, so the next person to sign in does not land on the previous user's page.
 */
export function redirectToLogin(returnPath?: string | null, reason?: LoginReason) {
  // A 401 on the sign-in page itself must not send it to itself again.
  if (isLoginPath(window.location.pathname)) return;
  const path = returnPath === null ? undefined : safeReturnPath(returnPath ?? currentPath());
  const params = new URLSearchParams();
  if (path) params.set('returnUrl', path);
  if (reason) params.set('reason', reason);
  const query = params.toString(); // not .size: older browsers lack it
  const url = `/login${query ? `?${query}` : ''}`;

  // On another host name than the canonical one (the short name vs the FQDN), go straight to the
  // canonical origin's sign-in page. sessionStorage does not cross origins but the query does.
  if (hopToCanonicalOrigin(url)) return;

  if (path) {
    const user = useAuthStore.getState().user; // null at boot: nobody to name then
    // At boot (Back to a page after the session idled out) the user is unknown, but the sign-in page
    // saved who it was for this same page: keep that, and fill in only what this call knows.
    const prev = readSavedReturn();
    const keep = !user && prev?.path === path && !prev.notYou ? prev : undefined;
    saveReturn({
      path,
      label: menuLabelFor(path) || keep?.label || '',
      reason,
      userId: user?.id ?? keep?.userId,
      // Only a session that timed out under a known user; never for a sign-out or a first visit.
      account:
        reason === 'idle' || reason === 'ended' ? (accountOf(user) ?? keep?.account) : undefined,
    });
  } else {
    // Nothing from the previous user's page may be restored by a later bare /login.
    clearSavedReturn();
  }
  leaveWithoutPrompt(() => (window.location.href = url));
}

/**
 * Start a fresh sign-in. The API owns the whole OIDC dance and the session cookie; this only sends
 * the browser to it (a top-level navigation, never XHR) and says where to come back to.
 */
export function startSignIn(returnPath?: string, options?: { loginHint?: string }) {
  const appOrigin = canonicalOrigin() ?? window.location.origin;
  const hint = options?.loginHint ? `&login_hint=${encodeURIComponent(options.loginHint)}` : '';
  const login = `${import.meta.env.VITE_API_URL}/auth/login?returnUrl=${encodeURIComponent(appOrigin + safeReturnPath(returnPath))}${hint}`;
  leaveWithoutPrompt(() => (window.location.href = login));
}
