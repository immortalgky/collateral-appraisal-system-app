/** p95 under 1000ms reads as milliseconds; at/above it reads as seconds with 1 decimal. A
 * missing value (the API omits the key rather than sending null) reads the same as null. */
export function formatP95(ms: number | null | undefined): string {
  if (ms == null) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

export function formatPercent(value: number | null | undefined): string {
  return value == null ? '—' : `${Math.round(value)}%`;
}

export function formatCount(value: number | null | undefined): string {
  return value == null ? '—' : Math.round(value).toLocaleString();
}

export function formatMb(value: number | null | undefined): string {
  return value == null ? '—' : `${Math.round(value).toLocaleString()} MB`;
}

/** One decimal place — for a rate like Gen2 GCs/hr or exceptions/min. */
export function formatRate(value: number | null | undefined): string {
  return value == null ? '—' : value.toFixed(1);
}

export interface UptimeBreakdown {
  /** Whole days — 0 until the process has run a full 24h, per the mock's upText(). */
  days: number;
  hours: number;
  minutes: number;
}

/**
 * Splits an uptime duration into days/hours/minutes so the caller can pick the right i18n phrasing
 * ("X days Y hr" once it clears 24h, else "X hr Y min") — text itself lives in i18n, not here.
 */
export function uptimeBreakdown(startIso: string, now: Date = new Date()): UptimeBreakdown {
  const totalHours = Math.max(0, (now.getTime() - new Date(startIso).getTime()) / 3_600_000);
  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    return { days, hours: Math.floor(totalHours % 24), minutes: 0 };
  }
  // Floor, never round — Math.round((0.995) * 60) is 60, which would print as "1h 60m".
  return { days: 0, hours: Math.floor(totalHours), minutes: Math.floor((totalHours % 1) * 60) };
}
