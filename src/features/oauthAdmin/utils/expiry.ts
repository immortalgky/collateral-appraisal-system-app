const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** A token this close to expiring is flagged amber. */
const SOON_MS = 10 * MINUTE;

export type Expiry =
  | { kind: 'expired' }
  | { kind: 'in'; unit: 'minutes' | 'hours' | 'days'; n: number; soon: boolean };

/**
 * How long until `expiration`, in the largest whole unit (minutes under an hour, hours under a day,
 * days beyond). Minutes round up, so "in 0 minutes" is never shown for a token that is still valid.
 */
export const describeExpiry = (expiration: string, now = Date.now()): Expiry => {
  const left = new Date(expiration).getTime() - now;
  if (left <= 0) return { kind: 'expired' };
  if (left < HOUR)
    return { kind: 'in', unit: 'minutes', n: Math.ceil(left / MINUTE), soon: left < SOON_MS };
  if (left < DAY) return { kind: 'in', unit: 'hours', n: Math.floor(left / HOUR), soon: false };
  return { kind: 'in', unit: 'days', n: Math.floor(left / DAY), soon: false };
};
