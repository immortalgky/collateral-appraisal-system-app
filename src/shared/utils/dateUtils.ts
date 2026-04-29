/**
 * Utility functions for handling common date operations
 */

/**
 * Format a date to a string using specified format
 * @param date Date to format
 * @param format Format string (default: 'yyyy-MM-dd')
 */
export function formatDate(date: Date | string | number, format = 'yyyy-MM-dd'): string {
  const d = typeof date === 'object' ? date : new Date(date);

  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  let result = format;
  result = result.replace('yyyy', String(year));
  result = result.replace('MM', month);
  result = result.replace('dd', day);

  if (format.includes('HH') || format.includes('mm') || format.includes('ss')) {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    result = result.replace('HH', hours);
    result = result.replace('mm', minutes);
    result = result.replace('ss', seconds);
  }

  return result;
}

/**
 * Add specified number of days to a date
 * @param date Original date
 * @param days Number of days to add
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Check if a date is today
 * @param date Date to check
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

const RELATIVE_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: 'year', ms: 365.25 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
];

/**
 * Locale-aware date formatter that follows the i18n language toggle.
 * Thai Buddhist calendar (`th-TH`) when `language` starts with `th-`, else `dd/MM/yyyy`.
 *
 * @param date          Date input (string/number/Date) — returns '—' when nullish.
 * @param language      i18n.language value (e.g. `i18n.language` from useTranslation()).
 */
export function formatLocaleDate(
  date: Date | string | number | null | undefined,
  language: string | undefined,
): string {
  if (date === null || date === undefined) return '—';
  const d = typeof date === 'object' ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';

  if (language?.startsWith('th')) {
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/**
 * Locale-aware date+time formatter that follows the i18n language toggle.
 * Thai Buddhist calendar (`th-TH`) when `language` starts with `th-`, else `dd/MM/yyyy HH:mm`.
 */
export function formatLocaleDateTime(
  date: Date | string | number | null | undefined,
  language: string | undefined,
): string {
  if (date === null || date === undefined) return '—';
  const d = typeof date === 'object' ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';

  if (language?.startsWith('th')) {
    return d.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

/**
 * Get relative time string (e.g., "2 days ago", "yesterday", "5 นาทีที่แล้ว")
 * Uses Intl.RelativeTimeFormat for locale-aware output.
 * @param date Date to get relative time for
 * @param locale BCP 47 locale string (default: 'en-US')
 */
export function getRelativeTimeString(date: Date | string | number, locale = 'en-US'): string {
  const d = typeof date === 'object' ? date : new Date(date);
  const diffMs = d.getTime() - Date.now();
  const absDiffMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  for (const { unit, ms } of RELATIVE_UNITS) {
    if (absDiffMs >= ms || unit === 'minute') {
      const value = Math.round(diffMs / ms);
      return rtf.format(value, unit);
    }
  }

  return rtf.format(0, 'minute');
}
