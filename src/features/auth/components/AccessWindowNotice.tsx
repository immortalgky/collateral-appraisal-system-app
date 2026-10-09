import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { getAccessWindowEnd, getFreshAccessToken } from '@shared/api/axiosInstance';
import { useAuthStore } from '../store';

/** Show the bar once the window is this close to closing. */
const WARN_AT_MS = 10 * 60 * 1000;

const logoutUrl = `${import.meta.env.VITE_API_URL}/connect/logout?client_id=spa&post_logout_redirect_uri=${import.meta.env.VITE_APP_URL}/`;

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
 * These accounts are only usable inside a window an admin opened, and the API stops honouring
 * their tokens the moment it closes. Without this the holder would discover that as a 401 in the
 * middle of whatever they came to do; the token carries the window's end, so the warning can come
 * early and the sign-out can be orderly. Every ordinary account is missing the claim and sees
 * nothing at all.
 */
export function AccessWindowNotice() {
  const { t } = useTranslation('auth');
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setRemaining(null);
      return;
    }

    let timer: number | undefined;
    let settling = false;

    const tick = async () => {
      const end = getAccessWindowEnd();
      if (!end) {
        setRemaining(null);
        return;
      }

      const left = end.getTime() - Date.now();
      setRemaining(left);
      if (left > 0 || settling) return;

      // The window this token describes is over — but an admin may have extended it since the token
      // was issued, and the new end only reaches us through a refreshed token. Ask for one before
      // concluding anything: a live window returns a token with a later end, and a closed one fails
      // the refresh outright (the API rejects it), which is the answer we act on.
      settling = true;
      const refreshed = await getFreshAccessToken().catch(() => null);
      const extendedTo = refreshed ? getAccessWindowEnd() : null;
      if (extendedTo && extendedTo.getTime() > Date.now()) {
        settling = false;
        setRemaining(extendedTo.getTime() - Date.now());
        return;
      }

      // Full navigation rather than a client-side redirect: this also ends the server session and
      // drops the refresh cookie, so a reopened tab cannot resume the closed window.
      window.clearInterval(timer);
      window.location.assign(logoutUrl);
    };

    void tick();
    timer = window.setInterval(() => void tick(), 1000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated]);

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
