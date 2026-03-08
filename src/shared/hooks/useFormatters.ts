import { useMemo } from 'react';
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
