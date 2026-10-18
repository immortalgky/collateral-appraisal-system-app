import { leaveWithoutPrompt } from '@shared/api/forcedNavigation';

/** `path` as a same-origin path+query+hash; anything that points elsewhere becomes `/`. */
function sameOriginPath(path: string, origin: string): string {
  const url = new URL(path, origin);
  return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : '/';
}

const currentPath = () => {
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
};

/**
 * The bare host name and the FQDN are cross-site to the API, so the Lax session cookie it sets
 * would not be sent back from the other one (and its CORS answers may not cover it). The server
 * always returns to VITE_APP_URL, so move to that origin first. Returns true when it navigated and
 * the caller should do nothing more.
 */
export function hopToCanonicalOrigin(returnPath?: string): boolean {
  let appOrigin: string;
  try {
    appOrigin = new URL(import.meta.env.VITE_APP_URL).origin;
  } catch {
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
 * Start a fresh sign-in. The API owns the whole OIDC dance and the session cookie; this only sends
 * the browser to it (a top-level navigation, never XHR) and says where to come back to.
 *
 * `returnPath` is where to land afterwards (a same-origin path, e.g. the page a signed-out user
 * asked for); it defaults to the current location.
 */
export function redirectToLogin(returnPath?: string) {
  const appOrigin = new URL(import.meta.env.VITE_APP_URL).origin;
  if (hopToCanonicalOrigin(returnPath)) return;
  const path = sameOriginPath(returnPath ?? currentPath(), appOrigin);

  // /login only exists to call this function; coming back to it would be a pointless extra hop.
  const back = new URL(path, appOrigin).pathname === '/login' ? '/' : path;
  const login = `${import.meta.env.VITE_API_URL}/auth/login?returnUrl=${encodeURIComponent(appOrigin + back)}`;
  leaveWithoutPrompt(() => (window.location.href = login));
}
