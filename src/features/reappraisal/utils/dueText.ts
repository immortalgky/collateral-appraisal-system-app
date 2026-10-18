import { useTranslation } from 'react-i18next';
import { DUE_SOON_DAYS, diffYMD, startOfToday, type Urgency } from './due';

/** Text colour per urgency; `later` stays neutral so only what needs attention stands out. */
export const URGENCY_TEXT: Record<Urgency, string> = {
  overdue: 'text-red-700',
  soon: 'text-amber-700',
  year: 'text-sky-700',
  later: 'text-gray-500',
};

/** "Overdue by 47 days" / "in 50 days" / "in 4 years 6 months". */
export function useRemainingText() {
  const { t } = useTranslation('reappraisal');
  return (due: Date, daysLeft: number): string => {
    if (daysLeft < 0) return t('due.overdue', { days: -daysLeft });
    if (daysLeft <= DUE_SOON_DAYS) return t('due.inDays', { days: daysLeft });
    const { y, m } = diffYMD(startOfToday(), due);
    const parts = [
      y > 0 ? t('due.years', { n: y }) : '',
      m > 0 ? t('due.months', { n: m }) : '',
    ].filter(Boolean);
    return t('due.inPeriod', { period: parts.join(' ') });
  };
}
