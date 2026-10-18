import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { refreshCurrentUser } from '../api';
import { useAuthStore } from '../store';

/** Show the bar once the window is this close to closing. */
const WARN_AT_MS = 10 * 60 * 1000;
/** Minimum gap between /auth/me checks once the window's end has passed. */
const RECHECK_MS = 10 * 1000;

/** "2:05" under an hour, "1:02:05" above it. */
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/**
 * Countdown bar for temporary-access accounts, and the sign-out that follows it.
 *
 * These accounts are only usable inside a window an admin opened, and the API ends their session
 * the moment it closes. Without this the holder would discover that as a 401 in the middle of
 * whatever they came to do; /auth/me carries the window's end, so the warning can come early.
 * Every ordinary account has no end date and sees nothing at all.
 */
export function AccessWindowNotice() {
  const { t } = useTranslation('auth');
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const accessExpiresAt = useAuthStore(state => state.user?.accessExpiresAt);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    // The end is written in the server's local time, which is the clock the whole system runs on.
    const end = isAuthenticated && accessExpiresAt ? new Date(accessExpiresAt) : null;
    if (!end || Number.isNaN(end.getTime())) {
      setRemaining(null);
      return;
    }

    // Earliest time the next /auth/me check may run, so a client clock that runs ahead of the
    // server's cannot turn the end of the window into a request per second.
    let nextCheckAt = 0;

    const tick = async () => {
      const left = end.getTime() - Date.now();
      setRemaining(left);
      if (left > 0 || Date.now() < nextCheckAt) return;
      nextCheckAt = Date.now() + RECHECK_MS;

      // The window this page loaded is over — but an admin may have changed it since, and the new
      // end only reaches us by asking again. The answer lands in the query cache and, through
      // fetchCurrentUser, in the store, which re-runs this effect: a later end keeps the countdown going, none hides the bar. A closed
      // window is a 401 (the API ended the session), which the axios interceptor turns into a
      // sign-in redirect, so there is nothing to do for it here. Any other failure is transient:
      // try again next time.
      // No retry: the 10 s re-check below is the retry.
      await refreshCurrentUser().catch(() => {});
    };

    void tick();
    const timer = window.setInterval(() => void tick(), 1000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, accessExpiresAt]);

  if (remaining === null || remaining > WARN_AT_MS) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
    >
      <Icon name="triangle-exclamation" style="solid" className="size-4 shrink-0" />
      <span>
        {t('accessWindow.endingSoon', { remaining: formatRemaining(Math.max(0, remaining)) })}
      </span>
      <span className="hidden sm:inline opacity-80">{t('accessWindow.saveYourWork')}</span>
    </div>
  );
}

export default AccessWindowNotice;
