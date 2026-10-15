import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { queryClient } from '@app/queryClient';
import Button from '@shared/components/Button';
import { currentUserQueryOptions, fetchCurrentUser } from '../api';
import { useAuthStore } from '../store';
import { hopToCanonicalOrigin } from '../utils/auth';
import { announceUser, listenForRemoteLogout } from '../utils/logout';

type BootState = 'loading' | 'ready' | 'failed';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('auth');
  const [state, setState] = useState<BootState>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => listenForRemoteLogout(), []);

  useEffect(() => {
    // Before anything is asked of the API: from a non-canonical host name its CORS answer may not
    // cover us, and the boot check would fail into the retry screen for good.
    if (hopToCanonicalOrigin()) return;

    // The session is an HttpOnly cookie, so asking the API who we are is the only way to know
    // whether there is one. skipAuthRedirect: a 401 here just means "not signed in yet" —
    // ProtectedRoute sends the user to /login; the axios interceptor must not jump the gun.
    // Fills the same cache entry useCurrentUser reads, so ProtectedRoute does not fetch it twice.
    queryClient
      .fetchQuery({
        ...currentUserQueryOptions,
        queryFn: () => fetchCurrentUser({ skipAuthRedirect: true }),
        // The retry screen below is the retry; the app default would hold the spinner for seconds.
        retry: false,
      })
      .then(user => {
        announceUser(user.id);
        setState('ready');
      })
      .catch(error => {
        // Only a 401 means "no session". A 5xx, a timeout or a dropped connection says nothing about
        // the session, and sending that user to sign in again would just fail the same way.
        if (isAxiosError(error) && error.response?.status === 401) {
          useAuthStore.setState({ isAuthenticated: false });
          setState('ready');
        } else {
          setState('failed');
        }
      });
  }, [attempt]);

  if (state === 'failed') {
    return (
      <div
        role="alert"
        className="flex h-screen w-full flex-col items-center justify-center gap-3 p-4 text-center"
      >
        <p className="text-base font-semibold text-gray-900">{t('init.failedTitle')}</p>
        <p className="max-w-md text-sm text-gray-500">{t('init.failedHint')}</p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setState('loading');
            setAttempt(a => a + 1);
          }}
        >
          {t('init.retry')}
        </Button>
      </div>
    );
  }

  // Children must not render until the boot check has settled: otherwise ProtectedRoute would see
  // "not authenticated" for a signed-in user and bounce them to /login on every page load.
  if (state === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary"
          role="status"
          aria-label={t('aria.initializing')}
        />
      </div>
    );
  }

  return <>{children}</>;
}
