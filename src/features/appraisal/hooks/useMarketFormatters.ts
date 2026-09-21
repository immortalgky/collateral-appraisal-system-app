import { useTranslation } from 'react-i18next';

const LOCALES: Record<string, string> = { th: 'th-TH', zh: 'zh-CN', en: 'en-GB' };

/**
 * Wording for the Markets tab's numbers: how old a piece of data is, how far away, what date.
 *
 * Returned as plain functions rather than memoised values — translating inside a memo freezes
 * whichever language happened to be loaded when it first ran.
 */
export function useMarketFormatters() {
  const { t, i18n } = useTranslation('appraisal');
  const locale = LOCALES[i18n.resolvedLanguage ?? 'th'] ?? 'th-TH';

  const age = (days: number): string => {
    if (days < 1) return t('markets.age.today');
    if (days < 14) return t('markets.age.days', { n: days });
    if (days < 60) return t('markets.age.weeks', { n: Math.round(days / 7) });
    if (days < 365) return t('markets.age.months', { n: Math.round(days / 30) });
    return t('markets.age.years', { n: (days / 365).toFixed(1).replace(/\.0$/, '') });
  };

  return {
    age,
    ago: (days: number): string =>
      days < 1 ? t('markets.age.today') : t('markets.ago', { age: age(days) }),
    distance: (km: number): string =>
      km < 1
        ? t('markets.distance.m', { n: Math.round(km * 1000).toLocaleString('en-US') })
        : t('markets.distance.km', { n: km.toFixed(1) }),
    date: (iso: string | null | undefined): string | null =>
      iso
        ? new Date(iso).toLocaleDateString(locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : null,
    money: (n: number): string => n.toLocaleString('en-US', { maximumFractionDigits: 0 }),
  };
}
