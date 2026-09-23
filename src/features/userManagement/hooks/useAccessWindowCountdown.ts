import { useEffect, useState } from 'react';

const WARNING_THRESHOLD_MS = 15 * 60 * 1000;

export interface AccessWindowCountdown {
  /** mm:ss under an hour remaining, h:mm at or above an hour. '0:00' once expired. */
  label: string;
  /** True once `expiresAt` is null or in the past. */
  isExpired: boolean;
  /** True while open and under 15 minutes remain — drives the card's warning accent. */
  isUnderWarningThreshold: boolean;
}

/**
 * Ticks once a second while `expiresAt` names a future local timestamp, so the card's
 * countdown updates live without the caller polling the server.
 */
export function useAccessWindowCountdown(expiresAt: string | null): AccessWindowCountdown {
  const target = expiresAt ? new Date(expiresAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (target === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  const msRemaining = target === null ? 0 : target - now;
  const isExpired = target === null || msRemaining <= 0;

  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const label =
    hours >= 1 ? `${hours}:${String(minutes).padStart(2, '0')}` : `${minutes}:${String(seconds).padStart(2, '0')}`;

  return {
    label,
    isExpired,
    isUnderWarningThreshold: !isExpired && msRemaining < WARNING_THRESHOLD_MS,
  };
}
