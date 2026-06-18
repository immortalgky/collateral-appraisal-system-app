import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useAuthStore } from '@features/auth/store';
import * as appHub from '@shared/realtime/appHub';

/**
 * Just the colored status dot — green when online (connected), grey otherwise.
 * Reused on the user avatar as a presence indicator and inside the status row.
 * `className` controls size/position; pass `ring` for a halo over the avatar.
 *
 * Display is two-state (online / offline): the underlying hub still tracks a
 * transient 'reconnecting' state, but it shows as offline until it's back up.
 */
export function ConnectionStatusDot({
  className = 'h-2.5 w-2.5',
  ring = false,
}: {
  className?: string;
  ring?: boolean;
}) {
  const status = useConnectionStatus();
  const online = status === 'connected';
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'inline-flex rounded-full',
        className,
        online ? 'bg-success' : 'bg-gray-400',
        ring && 'ring-2 ring-white dark:ring-base-100',
      )}
    />
  );
}

/**
 * Realtime connection status row for the user-profile dropdown. Shows a dot +
 * "Online" / "Offline"; clicking the whole row toggles the connection (also
 * handy for testing reconnect + catch-up).
 */
export default function ConnectionStatusIndicator() {
  const { t } = useTranslation('notification');
  const status = useConnectionStatus();
  const username = useAuthStore(s => s.user?.username);
  const online = status === 'connected';

  const toggle = (e: MouseEvent) => {
    // The dropdown stays open so the row can flip Online/Offline in place:
    // this is a plain <button>, not a MenuItem, so Headless UI's quick-release
    // ignores clicks on it (it only closes for [role="menuitem"] targets).
    // stopPropagation is belt-and-suspenders, not the load-bearing mechanism.
    e.stopPropagation();
    if (online) {
      appHub.stop().catch(() => {});
    } else if (username) {
      appHub.start(username).catch(() => {});
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!online && !username}
      className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-base-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <ConnectionStatusDot />
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {online ? t('connection.online') : t('connection.offline')}
      </span>
    </button>
  );
}
