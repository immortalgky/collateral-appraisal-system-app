import { formatDate } from '@/shared/utils/dateUtils';

/** Reappraisal is due five years after the last appraisal. */
export const REVIEW_CYCLE_YEARS = 5;

/** "Due soon" — the same 90-day line as the list's quick filter. */
export const DUE_SOON_DAYS = 90;

/** yyyy-MM-dd (or a longer ISO string) → local midnight; undefined when missing or invalid. */
export function parseDay(iso?: string | null): Date | undefined {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  if (!m) return undefined;
  const [y, mo, day] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  const d = new Date(y, mo, day);
  // Date rolls an impossible day over (31 Feb → 3 Mar); reject it instead.
  return d.getFullYear() === y && d.getMonth() === mo && d.getDate() === day ? d : undefined;
}

/** dd/MM/yyyy (the system's date format); '—' when missing. */
export function formatDay(value?: Date | string | null): string {
  const d = value instanceof Date ? value : parseDay(value);
  return d ? formatDate(d, 'dd/MM/yyyy') : '—';
}

/** 29 Feb plus a year lands on 28 Feb, as SQL Server's DATEADD(YEAR, …) does. */
export function addYears(d: Date, years: number): Date {
  return addMonthsClamped(d, years * 12);
}

export function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function addMonthsClamped(d: Date, months: number): Date {
  const first = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), lastDay));
}

/** Calendar-accurate whole years / months / days from `from` to `to` (from ≤ to). A month added to
 *  the 31st lands on the month's last day, so 31 Jan → 1 Mar is 1 month 1 day. */
export function diffYMD(from: Date, to: Date): { y: number; m: number; d: number } {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
  if (addMonthsClamped(from, months) > to) months--;
  const d = daysBetween(addMonthsClamped(from, months), to);
  return { y: Math.floor(months / 12), m: months % 12, d };
}

export type Urgency = 'overdue' | 'soon' | 'year' | 'later';

export function urgencyOf(daysLeft: number): Urgency {
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= DUE_SOON_DAYS) return 'soon';
  if (daysLeft <= 365) return 'year';
  return 'later';
}

/** Due date and days left for a book last appraised on `appraisalDate`. */
export function dueOf(appraisalDate?: string | null, today = startOfToday()) {
  const appraised = parseDay(appraisalDate);
  if (!appraised) return undefined;
  const due = addYears(appraised, REVIEW_CYCLE_YEARS);
  return { appraised, due, daysLeft: daysBetween(today, due) };
}
