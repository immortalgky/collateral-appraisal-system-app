import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { queryClient } from '@app/queryClient';
import { leaveWithoutPrompt } from '@shared/api/forcedNavigation';
import Button from '@shared/components/Button';
import { currentUserQueryOptions, fetchCurrentUser } from '../api';
import { useAuthStore } from '../store';
import {
  clearSavedReturn,
  hopToCanonicalOrigin,
  isLoginPath,
  isSavedUserOrUnknown,
  readSavedReturn,
  redirectToLogin,
  sessionEndReason,
} from '../utils/auth';
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
        // Only once the user is on an app page: on /login the saved state is still what it shows.
        if (!isLoginPath(window.location.pathname)) {
          const saved = readSavedReturn();
          // The timed-out user's page, but somebody else signed in: leave their page. The saved state
          // is cleared first, so the page it lands on cannot do this again.
          const strangerOnTheirPage =
            !!saved &&
            !isSavedUserOrUnknown(saved.userId, user.id) &&
            saved.path === window.location.pathname &&
            window.location.pathname !== '/';
          clearSavedReturn();
          if (strangerOnTheirPage) {
            leaveWithoutPrompt(() => window.location.replace('/'));
            return; // keep the spinner while the page leaves
          }
        }
        setState('ready');
      })
      .catch(error => {
        // Only a 401 means "no session". A 5xx, a timeout or a dropped connection says nothing about
        // the session, and sending that user to sign in again would just fail the same way.
        if (isAxiosError(error) && error.response?.status === 401) {
          useAuthStore.setState({ isAuthenticated: false });
          // The API says why a session ended (it idled out, say): carry that to the sign-in page, which
          // ProtectedRoute would otherwise reach with only the page asked for. Not from /login itself.
          const reason = sessionEndReason(error.response.headers['x-session-end']);
          if (reason && !isLoginPath(window.location.pathname)) {
            redirectToLogin(undefined, reason);
            // The page is on its way out: keep the spinner. Rendering the app now would let
            // ProtectedRoute navigate to /login on its own and cancel this one.
            return;
          }
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
        <p className="text-base font-semibold text-(--palette-ink)">{t('init.failedTitle')}</p>
        <p className="max-w-md text-sm text-(--palette-gray-500)">{t('init.failedHint')}</p>
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
          className="h-8 w-8 animate-spin rounded-full border-4 border-(--palette-line) border-t-primary"
          role="status"
          aria-label={t('aria.initializing')}
        />
      </div>
    );
  }

  return <>{children}</>;
}
