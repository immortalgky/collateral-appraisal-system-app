import type { TFunction } from 'i18next';
import { formatShortDateTime } from '@shared/utils/dateUtils';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const clock = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** "วันนี้ 19:00" / "พรุ่งนี้ 02:00" / "29 ก.ย. 18:29" — a date only when it is neither today nor tomorrow. */
export const formatJobTime = (
  value: string,
  now: Date,
  t: TFunction<'jobSchedules'>,
  language: string,
): string => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const dayDiff = Math.round((startOfDay(d) - startOfDay(now)) / DAY_MS);
  if (dayDiff === 0) return t('time.today', { time: clock(d) });
  if (dayDiff === 1) return t('time.tomorrow', { time: clock(d) });
  return formatShortDateTime(d, language);
};

/** "อีก 25 นาที" / "อีก 6 ชั่วโมง" / "อีก 7 วัน"; "ถึงกำหนดแล้ว" when the time has passed; empty when unreadable. */
export const formatTimeUntil = (value: string, now: Date, t: TFunction<'jobSchedules'>): string => {
  const ms = new Date(value).getTime() - now.getTime();
  if (isNaN(ms)) return '';
  if (ms <= 0) return t('time.due');
  // Round first, then pick the unit: 59.6 minutes is "1 hour", never "60 minutes" (likewise 24 hours).
  const minutes = Math.max(1, Math.round(ms / MINUTE_MS));
  if (minutes < 60) return t('time.inMinutes', { count: minutes });
  const hours = Math.round(ms / HOUR_MS);
  if (hours < 24) return t('time.inHours', { count: hours });
  return t('time.inDays', { count: Math.round(ms / DAY_MS) });
};
