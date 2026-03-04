// utils/dateUtils.ts

export interface DateDuration {
  years: number;
  months: number;
}

/**
 * Calculates the difference in years and months from a given date to now.
 *
 * Why we do manual calendar math instead of simple division:
 * - Months have different lengths (28–31 days)
 * - Dividing total days by 30.44 gives inaccurate results
 */
export function calculateDuration(dateString: string, now: Date = new Date()): DateDuration {
  // 🔴 Always validate input — DB strings can be null/malformed
  if (!dateString) {
    return { years: 0, months: 0 };
  }

  const startDate = new Date(dateString);

  if (isNaN(startDate.getTime())) {
    throw new Error(`Invalid date string: "${dateString}"`);
  }

  if (startDate > now) {
    throw new Error('Start date cannot be in the future');
  }

  let years = now.getFullYear() - startDate.getFullYear();
  let months = now.getMonth() - startDate.getMonth();

  // If the current day-of-month is before the start day-of-month,
  // we haven't completed this month yet — subtract one month.
  if (now.getDate() < startDate.getDate()) {
    months--;
  }

  // If months went negative, borrow from years
  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months };
}

/**
 * Formats the duration into a human-readable string.
 * Separated from calculation for Single Responsibility Principle.
 */
export function formatDuration({ years, months }: DateDuration): string {
  const parts: string[] = [];

  if (years > 0) {
    parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  }
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  }

  return parts.length > 0 ? parts.join(' and ') : 'Less than a month';
}

export function formatDate(dateString: string): string {
  return '';
}

/**
 * Format a date to a string using specified format
 * Tokens supported: yyyy, MM, MMM, MMMM, dd, HH, mm, ss
 */
export function formatInformationDate(
  date: Date | string | number,
  format = 'yyyy-MM-dd',
  locale = 'en-US',
): string {
  const d = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(d.getTime())) return 'Invalid Date';

  const year = String(d.getFullYear());
  const month2 = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  // Month names (localized via Intl)
  const monthShort = new Intl.DateTimeFormat(locale, { month: 'short' }).format(d); // Feb
  const monthLong = new Intl.DateTimeFormat(locale, { month: 'long' }).format(d); // February

  const map: Record<string, string> = {
    yyyy: year,
    MMMM: monthLong,
    MMM: monthShort,
    MM: month2,
    dd: day,
    HH: hours,
    mm: minutes,
    ss: seconds,
  };

  return format.replace(/yyyy|MMMM|MMM|MM|dd|HH|mm|ss/g, token => map[token] ?? token);
}
