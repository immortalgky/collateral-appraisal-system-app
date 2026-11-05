import i18n, { type ResourceLanguage } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
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
import enFeeStructureMaintenance from './locales/en/feeStructureMaintenance.json';
import enEvaluationConfig from './locales/en/evaluationConfig.json';
import enBlockProject from './locales/en/blockProject.json';
import enWorkflowBuilder from './locales/en/workflowBuilder.json';
import enBlockReappraisal from './locales/en/blockReappraisal.json';
import enWorkflowAssignmentConfig from './locales/en/workflowAssignmentConfig.json';
import enCompanyRoundRobinConfig from './locales/en/companyRoundRobinConfig.json';
import enJobSchedules from './locales/en/jobSchedules.json';
import enAddressMaster from './locales/en/addressMaster.json';
import enAppraisalDataCorrection from './locales/en/appraisalDataCorrection.json';
import enHangfire from './locales/en/hangfire.json';
import enFailedMessages from './locales/en/failedMessages.json';
import enTask from './locales/en/task.json';

// Thai and Chinese are bundled inline too, via an eager glob: a lazily loaded namespace
// suspends the first component that uses it, and a suspend on a task page hides and
// re-shows its whole SuspenseOutlet, which refetches every query on it 2-3 times. The
// cost is a larger entry chunk, accepted. `en` stays as explicit imports because
// `resources['en']` is what types the namespaces (see types.ts).
const bundledNamespaces = (files: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(files).map(([path, bundle]) => [
      path.split('/').pop()!.slice(0, -'.json'.length),
      bundle,
    ]),
  ) as ResourceLanguage;
const thFiles = import.meta.glob('./locales/th/*.json', { eager: true, import: 'default' });
const zhFiles = import.meta.glob('./locales/zh/*.json', { eager: true, import: 'default' });

export const defaultNS = 'common' as const;

/** Single source of truth: `supportedLngs` and the detector's region stripping both read it. */
const SUPPORTED_LANGUAGES = ['en', 'th', 'zh'] as const;

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
    feeStructureMaintenance: enFeeStructureMaintenance,
    evaluationConfig: enEvaluationConfig,
    blockProject: enBlockProject,
    workflowBuilder: enWorkflowBuilder,
    blockReappraisal: enBlockReappraisal,
    workflowAssignmentConfig: enWorkflowAssignmentConfig,
    companyRoundRobinConfig: enCompanyRoundRobinConfig,
    jobSchedules: enJobSchedules,
    addressMaster: enAddressMaster,
    appraisalDataCorrection: enAppraisalDataCorrection,
    hangfire: enHangfire,
    failedMessages: enFailedMessages,
    task: enTask,
  },
  // A namespace with no th/zh file (zh has several) falls back to `en` per key.
  th: bundledNamespaces(thFiles),
  zh: bundledNamespaces(zhFiles),
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
    ns: [defaultNS],
    // Deliberately WITHOUT `nonExplicitSupportedLngs`: that option strips the
    // region before the support check, which makes `th-TH` itself "supported" and
    // leaves the tag on `i18n.language` — the very thing `convertDetectedLanguage`
    // below exists to prevent.
    //
    // The invariant is that `i18n.language` is always a bare code. `supportedLngs`
    // alone gets there for a programmatic call: `changeLanguage('th-TH')` finds no
    // exact match, falls back to the language part, and yields `th` (measured).
    // The DETECTOR still needs the conversion below, because it returns a LIST —
    // localStorage and navigator concatenated — so `['th-TH', 'en-US', 'en']`
    // matches the bare `en` from navigator before anything tries `th-TH`'s language
    // part, and a Thai user boots in English.
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // The cookie is shared with the identity provider's login page (same host, other port: cookies
      // are not port-scoped), so a language picked on either page is the one the other shows.
      order: ['cookie', 'localStorage', 'navigator'],
      lookupCookie: 'cas-lang',
      lookupLocalStorage: 'app-language',
      caches: ['localStorage', 'cookie'],
      cookieMinutes: 60 * 24 * 365,
      cookieOptions: { path: '/', sameSite: 'lax', secure: true },
      // The detector returns a LIST — localStorage and navigator concatenated —
      // and `getBestMatchFromCodes` takes the first *supported* entry. So a stored
      // `th-TH` loses to navigator's bare `en`, and the user boots in English with
      // `en` cached back over their choice. Measured: with an identity conversion
      // here, `th-TH` yields language/resolved/cached all `en`.
      //
      // Stripping the region up front also keeps `i18n.language` a bare code,
      // which the menu relies on: useNavigation.ts, useMenuLabel.ts and
      // useBreadcrumb.ts each pass it to `resolveLabel(labels, lang)`, which does
      // `labels[lang] ?? labels['en']` — so a region tag silently degrades every
      // menu item and breadcrumb to English.
      // Strip the region only when the full code is not one we ship. Always
      // stripping would make a region-qualified language unreachable AND destroy
      // the user's stored choice: add `zh-TW`, a user picks it, `cacheUserLanguage`
      // writes `zh-TW`, then the next boot's detector reads it back, this converter
      // reduces it to `zh`, and `cacheUserLanguage('zh')` overwrites their
      // preference — silently, on one reload.
      convertDetectedLanguage: (lng: string) =>
        (SUPPORTED_LANGUAGES as readonly string[]).includes(lng) ? lng : lng.split('-')[0],
    },
  });

// Also sync immediately in case init completed synchronously before the listener was ready
syncLocale(i18n.language);

export default i18n;
