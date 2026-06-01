import type { TFunction } from 'i18next';

export function timeAgo(isoString: string, t: TFunction<'notification'>): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return t('timeAgo.justNow');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('timeAgo.minutes', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('timeAgo.hours', { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('timeAgo.days', { n: days });
  const weeks = Math.floor(days / 7);
  return t('timeAgo.weeks', { n: weeks });
}
