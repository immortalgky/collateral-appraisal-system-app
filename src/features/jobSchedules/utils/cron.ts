import type { TFunction } from 'i18next';

export type CronSummary =
  | { kind: 'hourly'; minute: number }
  | { kind: 'daily'; minute: number; hour: number }
  | { kind: 'monthly'; minute: number; hour: number; day: number }
  | { kind: 'weekly'; minute: number; hour: number; weekday: number };

/** A plain integer within [min, max], else null (so `*`, ranges, lists and steps all fall out). */
const int = (field: string, min: number, max: number): number | null => {
  if (!/^\d+$/.test(field)) return null;
  const n = Number(field);
  return n >= min && n <= max ? n : null;
};

/**
 * Recognises only the four shapes the scheduled jobs actually use — `m * * * *`, `m h * * *`,
 * `m h d * *`, `m h * * w` — and returns null for everything else (steps, ranges, lists, a month,
 * a seconds field), so the caller shows the raw cron alone rather than guessing a wrong sentence.
 */
export const parseCron = (cron: string): CronSummary | null => {
  const fields = cron.trim().split(/\s+/);
  if (fields.length !== 5) return null;
  const [m, h, d, month, w] = fields;
  const minute = int(m, 0, 59);
  if (minute === null || month !== '*') return null;

  if (h === '*') return d === '*' && w === '*' ? { kind: 'hourly', minute } : null;
  const hour = int(h, 0, 23);
  if (hour === null) return null;

  if (d === '*' && w === '*') return { kind: 'daily', minute, hour };
  if (w === '*') {
    const day = int(d, 1, 31);
    return day === null ? null : { kind: 'monthly', minute, hour, day };
  }
  if (d === '*') {
    const weekday = int(w, 0, 7);
    return weekday === null ? null : { kind: 'weekly', minute, hour, weekday: weekday % 7 };
  }
  return null;
};

const WEEKDAY_KEYS = [
  'cron.weekday.sun',
  'cron.weekday.mon',
  'cron.weekday.tue',
  'cron.weekday.wed',
  'cron.weekday.thu',
  'cron.weekday.fri',
  'cron.weekday.sat',
] as const;

const pad = (n: number) => String(n).padStart(2, '0');

/** The cron as a sentence in the UI language ("ทุกวัน 04:00"), or null when it is not one of the known shapes. */
export const describeCron = (cron: string, t: TFunction<'jobSchedules'>): string | null => {
  const parsed = parseCron(cron);
  if (!parsed) return null;
  const minute = pad(parsed.minute);
  switch (parsed.kind) {
    case 'hourly':
      return t('cron.hourly', { minute });
    case 'daily':
      return t('cron.daily', { time: `${pad(parsed.hour)}:${minute}` });
    case 'monthly':
      return t('cron.monthly', { day: parsed.day, time: `${pad(parsed.hour)}:${minute}` });
    case 'weekly':
      return t('cron.weekly', {
        weekday: t(WEEKDAY_KEYS[parsed.weekday]),
        time: `${pad(parsed.hour)}:${minute}`,
      });
  }
};
