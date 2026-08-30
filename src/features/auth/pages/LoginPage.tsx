import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { redirectToLogin } from '@features/auth/utils/auth.ts';
import { useAuthStore } from '../store';

function LoginPage() {
  const { t } = useTranslation('auth');
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  // StrictMode runs effects twice in development; without this the redirect fires twice and writes
  // two PKCE verifier/state pairs.
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Bail out for an already-signed-in user. This route is reachable directly — a bookmark, a typed
    // URL, a stale link — and redirectToLogin() asks the server for prompt=login, which destroys the
    // Identity SSO cookie. That is a real state change, so it must only happen when the session is
    // genuinely over, not merely because someone navigated here.
    if (isAuthenticated || hasRedirected.current) return;
    hasRedirected.current = true;
    redirectToLogin();
  }, [isAuthenticated]);

  if (isAuthenticated) return <Navigate to="/" replace />;

  return <div>{t('page.redirecting')}</div>;
}

export default LoginPage;
