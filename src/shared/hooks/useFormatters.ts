import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { th, enUS } from 'date-fns/locale';

export function useDateLocale() {
  const { i18n } = useTranslation();
  return i18n.language?.startsWith('th') ? th : enUS;
}

export function useNumberFormatter(options?: Intl.NumberFormatOptions) {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith('th') ? 'th-TH' : 'en-US';

  return useMemo(() => new Intl.NumberFormat(locale, options), [locale, options]);
}

export function useDateFormatter(options?: Intl.DateTimeFormatOptions) {
  const { i18n } = useTranslation();
  const isThai = i18n.language?.startsWith('th');
  const locale = isThai ? 'th-TH-u-ca-buddhist' : 'en-US';

  return useMemo(() => new Intl.DateTimeFormat(locale, options), [locale, options]);
}

const RELATIVE_TIME_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: 'year', ms: 365.25 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
];

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function useRelativeTime() {
  const { i18n } = useTranslation();
  const isThai = i18n.language?.startsWith('th');
  const locale = isThai ? 'th-TH' : 'en-US';
  const dateLocale = isThai ? 'th-TH-u-ca-buddhist' : 'en-US';

  const rtf = useMemo(() => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }), [locale]);
  const fallbackFormatter = useMemo(
    () => new Intl.DateTimeFormat(dateLocale, { year: 'numeric', month: 'short', day: 'numeric' }),
    [dateLocale],
  );

  return useCallback(
    (date: Date | string): { relative: string; absolute: string } => {
      const d = typeof date === 'string' ? new Date(date) : date;
      const absolute = fallbackFormatter.format(d);
      const diffMs = d.getTime() - Date.now();
      const absDiffMs = Math.abs(diffMs);

      if (absDiffMs > THIRTY_DAYS_MS) {
        return { relative: absolute, absolute };
      }

      for (const { unit, ms } of RELATIVE_TIME_UNITS) {
        if (absDiffMs >= ms || unit === 'minute') {
          const value = Math.round(diffMs / ms);
          return { relative: rtf.format(value, unit), absolute };
        }
      }

      return { relative: rtf.format(0, 'minute'), absolute };
    },
    [rtf, fallbackFormatter],
  );
}
