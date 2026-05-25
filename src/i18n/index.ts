import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { useLocaleStore } from '@shared/store';

import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enWebhookAdmin from './locales/en/webhookAdmin.json';
import enInvoice from './locales/en/invoice.json';
import enServiceQualityEvaluation from './locales/en/serviceQualityEvaluation.json';
import enMonitoring from './locales/en/monitoring.json';
import enHistorySearch from './locales/en/historySearch.json';
import enBlockUnitMaintenance from './locales/en/blockUnitMaintenance.json';
import thCommon from './locales/th/common.json';
import thNav from './locales/th/nav.json';
import thWebhookAdmin from './locales/th/webhookAdmin.json';
import thInvoice from './locales/th/invoice.json';
import thServiceQualityEvaluation from './locales/th/serviceQualityEvaluation.json';
import thMonitoring from './locales/th/monitoring.json';
import thHistorySearch from './locales/th/historySearch.json';
import thBlockUnitMaintenance from './locales/th/blockUnitMaintenance.json';
import zhCommon from './locales/zh/common.json';
import zhNav from './locales/zh/nav.json';
import zhWebhookAdmin from './locales/zh/webhookAdmin.json';
import zhInvoice from './locales/zh/invoice.json';
import zhServiceQualityEvaluation from './locales/zh/serviceQualityEvaluation.json';

export const defaultNS = 'common' as const;

export const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    webhookAdmin: enWebhookAdmin,
    invoice: enInvoice,
    serviceQualityEvaluation: enServiceQualityEvaluation,
    monitoring: enMonitoring,
    historySearch: enHistorySearch,
    blockUnitMaintenance: enBlockUnitMaintenance,
  },
  th: {
    common: thCommon,
    nav: thNav,
    webhookAdmin: thWebhookAdmin,
    invoice: thInvoice,
    serviceQualityEvaluation: thServiceQualityEvaluation,
    monitoring: thMonitoring,
    historySearch: thHistorySearch,
    blockUnitMaintenance: thBlockUnitMaintenance,
  },
  zh: {
    common: zhCommon,
    nav: zhNav,
    webhookAdmin: zhWebhookAdmin,
    invoice: zhInvoice,
    serviceQualityEvaluation: zhServiceQualityEvaluation,
    // monitoring + historySearch + blockUnitMaintenance fall back to English for zh
    // users until real Chinese translations are provided.
    monitoring: enMonitoring,
    historySearch: enHistorySearch,
    blockUnitMaintenance: enBlockUnitMaintenance,
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
