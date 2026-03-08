import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { useLocaleStore } from '@shared/store';

import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import thCommon from './locales/th/common.json';
import thNav from './locales/th/nav.json';
import zhCommon from './locales/zh/common.json';
import zhNav from './locales/zh/nav.json';

export const defaultNS = 'common' as const;

export const resources = {
  en: {
    common: enCommon,
    nav: enNav,
  },
  th: {
    common: thCommon,
    nav: thNav,
  },
  zh: {
    common: zhCommon,
    nav: zhNav,
  },
} as const;

const resolveParameterLang = (lng: string): string => {
  if (lng?.startsWith('th')) return 'th';
  // Backend parameters only have EN/TH; other languages fall back to EN
  return 'en';
};

const syncLocale = (lng: string) => {
  useLocaleStore.getState().setLocale('th', resolveParameterLang(lng));
};

// Register before init so the listener catches the initial languageChanged event
i18n.on('languageChanged', syncLocale);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'app-language',
      caches: ['localStorage'],
    },
  });

// Also sync immediately in case init completed synchronously before the listener was ready
syncLocale(i18n.language);

export default i18n;
