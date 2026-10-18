import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';
import { redirectToLogin } from '@features/auth/utils/auth';
import { useAuthStore } from '../store';

function LoginPage() {
  const { t } = useTranslation('auth');
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  // ProtectedRoute leaves the page the user asked for here, so sign-in can bring them back to it.
  const from = (useLocation().state as { from?: string } | null)?.from;
  // StrictMode runs effects twice in development; without this the redirect fires twice.
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Bail out for an already-signed-in user. This route is reachable directly — a bookmark, a typed
    // URL, a stale link — and /auth/login always sends the browser to the identity provider with
    // prompt=login, so a signed-in user would be made to re-enter credentials for nothing. The
    // current session is only replaced if that sign-in is completed, but the detour itself should
    // only happen when the session is genuinely over, not merely because someone navigated here.
    if (isAuthenticated || hasRedirected.current) return;
    hasRedirected.current = true;
    redirectToLogin(from);
  }, [isAuthenticated, from]);

  if (isAuthenticated) return <Navigate to="/" replace />;

  return <div>{t('page.redirecting')}</div>;
}

export default LoginPage;
