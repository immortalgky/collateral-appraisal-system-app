/** Format number with 2 decimal places and thousands separator */
export const fmt = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return '-';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/** Format number in compact form: 11.2M, 500K, etc. */
export const fmtCompact = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

/** Format date string as DD/MM/YYYY */
export function formatDateOnly(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format an audit timestamp as DD/MM/YYYY HH:mm, in the viewer's own timezone.
 *
 * Deliberately separate from formatDateOnly rather than an option on it: every other caller of
 * that helper formats a *calendar* date — appraisal date, lease start/end, contract start/end —
 * where a clock time is meaningless and would render as a misleading 00:00. This one is for
 * fields that genuinely carry a time (the server sends `DateTime? UpdatedAt`).
 */
export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Safe number conversion — returns 0 for non-finite values */
export const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
