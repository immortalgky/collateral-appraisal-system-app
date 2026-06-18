import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { useLocaleStore } from '@shared/store';

import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enWebhookAdmin from './locales/en/webhookAdmin.json';
import enOauthAdmin from './locales/en/oauthAdmin.json';
import enInvoice from './locales/en/invoice.json';
import enServiceQualityEvaluation from './locales/en/serviceQualityEvaluation.json';
import enMonitoring from './locales/en/monitoring.json';
import enHistorySearch from './locales/en/historySearch.json';
import enBlockUnitMaintenance from './locales/en/blockUnitMaintenance.json';
import enLogAdmin from './locales/en/logAdmin.json';
import enReappraisal from './locales/en/reappraisal.json';
import enTaskMonitor from './locales/en/taskMonitor.json';
import enCommittee from './locales/en/committee.json';
import enNotification from './locales/en/notification.json';
import enMeeting from './locales/en/meeting.json';
import enTemplateManagement from './locales/en/templateManagement.json';
import enRequest from './locales/en/request.json';
import enQuotation from './locales/en/quotation.json';
import enDashboard from './locales/en/dashboard.json';
import enAuth from './locales/en/auth.json';
import enDocumentFollowup from './locales/en/documentFollowup.json';
import enMenuManagement from './locales/en/menuManagement.json';
import enSupportingDataMaintenance from './locales/en/supportingDataMaintenance.json';
import enUserManagement from './locales/en/userManagement.json';
import enPricingAnalysis from './locales/en/pricingAnalysis.json';
import enAppraisal from './locales/en/appraisal.json';
import enFeeAppointmentApproval from './locales/en/feeAppointmentApproval.json';
import enFeeApprovalConfig from './locales/en/feeApprovalConfig.json';
import enEvaluationConfig from './locales/en/evaluationConfig.json';
import enBlockProject from './locales/en/blockProject.json';
import enWorkflowBuilder from './locales/en/workflowBuilder.json';
import enBlockReappraisal from './locales/en/blockReappraisal.json';
import enWorkflowAssignmentConfig from './locales/en/workflowAssignmentConfig.json';
import enCompanyRoundRobinConfig from './locales/en/companyRoundRobinConfig.json';

export const defaultNS = 'common' as const;

export const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    webhookAdmin: enWebhookAdmin,
    oauthAdmin: enOauthAdmin,
    invoice: enInvoice,
    serviceQualityEvaluation: enServiceQualityEvaluation,
    monitoring: enMonitoring,
    historySearch: enHistorySearch,
    blockUnitMaintenance: enBlockUnitMaintenance,
    logAdmin: enLogAdmin,
    reappraisal: enReappraisal,
    taskMonitor: enTaskMonitor,
    committee: enCommittee,
    notification: enNotification,
    meeting: enMeeting,
    templateManagement: enTemplateManagement,
    request: enRequest,
    quotation: enQuotation,
    dashboard: enDashboard,
    auth: enAuth,
    documentFollowup: enDocumentFollowup,
    menuManagement: enMenuManagement,
    supportingDataMaintenance: enSupportingDataMaintenance,
    userManagement: enUserManagement,
    pricingAnalysis: enPricingAnalysis,
    appraisal: enAppraisal,
    feeAppointmentApproval: enFeeAppointmentApproval,
    feeApprovalConfig: enFeeApprovalConfig,
    evaluationConfig: enEvaluationConfig,
    blockProject: enBlockProject,
    workflowBuilder: enWorkflowBuilder,
    blockReappraisal: enBlockReappraisal,
    workflowAssignmentConfig: enWorkflowAssignmentConfig,
    companyRoundRobinConfig: enCompanyRoundRobinConfig,
  },
} as const;

/**
 * English is bundled inline (above) as the fallback language. Thai and Chinese
 * are NOT bundled — they are fetched on demand, one chunk per namespace.
 *
 * `import.meta.glob` builds a map of lazy `() => import()` loaders for every
 * non-English locale file (en is excluded because it's already inline — that
 * also avoids Rollup "dynamic import will not move module" warnings for the en
 * JSON). A namespace with no file for the requested language has no loader, so
 * we reject explicitly and let i18next fall back to `en` (fallbackLng) — a clean
 * controlled fallback rather than a thrown "unknown variable dynamic import".
 */
const localeLoaders = import.meta.glob<{ default: Record<string, unknown> }>([
  './locales/*/*.json',
  '!./locales/en/*.json',
]);

const lazyBackend = resourcesToBackend((language: string, namespace: string) =>
  localeLoaders[`./locales/${language}/${namespace}.json`]?.() ??
  Promise.reject(new Error(`No bundled locale for ${language}/${namespace}`))
);

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
  .use(lazyBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // `resources` only bundles `en`; th/zh come from lazyBackend, so tell
    // i18next that the bundled set is partial and it should still hit the
    // backend for languages/namespaces not present inline.
    partialBundledLanguages: true,
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

// These namespaces have no zh translation file and no feature-level i18n.ts that
// registers them, so reuse English explicitly for zh — mirrors the prior inline
// behavior and avoids a failing dynamic import (404 + console error) the first
// time a zh user opens these pages. (Other zh-less namespaces such as
// feeAppointmentApproval/feeApprovalConfig/evaluationConfig are already handled
// by their feature i18n.ts via addResourceBundle.)
i18n.addResourceBundle('zh', 'monitoring', enMonitoring, true, false);
i18n.addResourceBundle('zh', 'historySearch', enHistorySearch, true, false);
i18n.addResourceBundle('zh', 'blockUnitMaintenance', enBlockUnitMaintenance, true, false);
i18n.addResourceBundle('zh', 'workflowAssignmentConfig', enWorkflowAssignmentConfig, true, false);
i18n.addResourceBundle('zh', 'companyRoundRobinConfig', enCompanyRoundRobinConfig, true, false);

// Also sync immediately in case init completed synchronously before the listener was ready
syncLocale(i18n.language);

export default i18n;
