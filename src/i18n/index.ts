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

// Thai and Chinese are otherwise lazy (see `lazyBackend` below); `common` is the
// one namespace bundled inline for them. See the note on `resources` for why.
import thCommon from './locales/th/common.json';
import zhCommon from './locales/zh/common.json';

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
  },
  // th/zh deliberately bundle ONLY `common`. i18next's setResolvedLanguage() picks
  // the first language in the resolve hierarchy that already has *some* translation
  // in the store, and on a cold boot that runs before the backend has fetched
  // anything. With no Thai in the store it resolved to `en`, react-i18next then read
  // hasLoadedNamespace() against `en` (bundled => "loaded"), never suspended, and so
  // never requested a single Thai chunk: i18n.language stayed 'th' (the switcher
  // showed TH) while every t() rendered English, permanently. Seeding one namespace
  // per language fixes the resolution; every other namespace still loads on demand.
  th: { common: thCommon },
  zh: { common: zhCommon },
} as const;

/**
 * English is bundled inline (above) as the fallback language. Thai and Chinese
 * bundle only `common`; every other namespace is fetched on demand, one chunk each.
 *
 * `import.meta.glob` builds a map of lazy `() => import()` loaders for every
 * non-English locale file (en is excluded because it's already inline — that
 * also avoids Rollup "dynamic import will not move module" warnings for the en
 * JSON). A namespace with no file for the requested language has no loader, so
 * we reject explicitly and let i18next fall back to `en` (fallbackLng) — a clean
 * controlled fallback rather than a thrown "unknown variable dynamic import".
 */
// Exported for coldBootLanguage.test.ts. Unlike `resources` — which i18next takes
// by reference and writes every lazily loaded chunk into — this map is built by
// Vite at transform time and never mutated, so it is the only thing a test can
// read to prove a namespace CANNOT be loaded asynchronously.
export const localeLoaders = import.meta.glob<{ default: Record<string, unknown> }>([
  './locales/*/*.json',
  '!./locales/en/*.json',
  // `common` is inline for th and zh (see `resources`), so those two need no loader
  // — and excluding them keeps Rollup from warning that a statically imported
  // module also has a dynamic import.
  //
  // Listed per language rather than as `*/common.json` on purpose: a future locale
  // that is NOT inlined must keep its loader, or the app's default namespace would
  // reject on every boot for it. Note this is forward-looking only — with en
  // excluded wholesale and th/zh the only other locale dirs, the two spellings
  // produce an identical loader map today, so no test can tell them apart. The
  // per-language boot cases in coldBootLanguage.test.ts are derived from the
  // locales/ directory and start distinguishing them the moment a fourth language
  // lands; verified by temporarily adding a `ja` locale dir, where the `*` spelling
  // produces `failedLoading: ['ja/common']`.
  '!./locales/th/common.json',
  '!./locales/zh/common.json',
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
    // `resources` bundles all of `en` but only `common` for th/zh, so tell
    // i18next that the bundled set is partial and it should still hit the
    // backend for languages/namespaces not present inline.
    partialBundledLanguages: true,
    fallbackLng: 'en',
    defaultNS,
    // `defaultNS` does NOT set `ns`. Left unset it stays i18next's default
    // ['translation'], and init() then asks the backend for a `translation.json`
    // that does not exist in any language — a guaranteed rejected import on every
    // boot. `common` is inline for all three languages, so this costs no request.
    ns: ['common'],
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
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'app-language',
      caches: ['localStorage'],
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

/**
 * Serve English for a namespace that has no JSON file in `lng` yet.
 *
 * Needed because a namespace i18next knows nothing about is worse than one that
 * is explicitly English: now that th/zh resolve to themselves, react-i18next
 * suspends on the missing chunk, the dynamic import rejects, and the user gets a
 * loader flash plus a console error before landing on English regardless.
 *
 * The `localeLoaders` guard makes each registration **self-retiring**. Without it
 * the eager bundle wins forever: `BackendConnector.queueLoad` marks a pair whose
 * bundle already exists as state 2 (loaded) and never fetches it, so the day a
 * translator lands the real file it would be shadowed — silently, with no error
 * and no failing test. Skipping the fallback lets per-key `fallbackLng: 'en'`
 * cover any gaps in the new file instead.
 */
// Exported for src/i18n/__tests__/coldBootRender.test.tsx: the guard below only
// changes behaviour for a (lng, ns) pair that HAS a locale file, and by
// construction no call site here is such a pair — so the contract is only
// testable by invoking it directly with one that is.
export const registerEnglishFallback = <
  // `common` is excluded: it is the one namespace deliberately kept out of
  // `localeLoaders` (it is inline for all three languages), so the guard below
  // cannot tell "no loader" from "no file" for it and would register a fallback
  // that should never exist. Not because English would win — `addResourceBundle`
  // passes `overwrite: false` and `deepExtend` only assigns a string leaf
  // `if (overwrite)`, so the merge is purely additive. The harm is subtler: it
  // would silently backfill whatever keys the Thai/Chinese `common` is missing,
  // hiding exactly the gap localeParity.test.ts exists to surface, and since
  // `deepExtend`'s target is the live store it would mutate the statically
  // imported JSON module object in place.
  N extends Exclude<keyof (typeof resources)['en'], 'common'>,
>(
  lng: 'th' | 'zh',
  ns: N,
  // Tied to `ns` on purpose: across ten near-identical call lines an untyped
  // `object` would let ('zh', 'jobSchedules', enAddressMaster) compile and ship
  // the wrong namespace, and no test would notice.
  bundle: (typeof resources)['en'][N],
) => {
  if (localeLoaders[`./locales/${lng}/${ns}.json`]) return;
  i18n.addResourceBundle(lng, ns, bundle, true, false);
};

// No zh file and no feature-level i18n.ts that registers them. (Other zh-less
// namespaces such as feeAppointmentApproval/feeApprovalConfig/evaluationConfig are
// already handled by their feature i18n.ts via addResourceBundle.)

registerEnglishFallback('zh', 'monitoring', enMonitoring);
registerEnglishFallback('zh', 'historySearch', enHistorySearch);
registerEnglishFallback('zh', 'blockUnitMaintenance', enBlockUnitMaintenance);
registerEnglishFallback('zh', 'appraisalDataCorrection', enAppraisalDataCorrection);
registerEnglishFallback('zh', 'workflowAssignmentConfig', enWorkflowAssignmentConfig);
registerEnglishFallback('zh', 'companyRoundRobinConfig', enCompanyRoundRobinConfig);
registerEnglishFallback('zh', 'jobSchedules', enJobSchedules);
registerEnglishFallback('zh', 'addressMaster', enAddressMaster);
registerEnglishFallback('zh', 'hangfire', enHangfire);

// `oauthAdmin` is the only namespace missing a **th** file too, so Thai needs the
// same treatment. A real th/oauthAdmin.json is still owed: `localeParity.test.ts`
// asserts a th file exists for every en namespace and has no th opt-out, so it
// stays red for this one until the translation lands — at which point the guard
// above retires this registration on its own. (That suite is red for other,
// pre-existing reasons as well; oauthAdmin is not the only failing case.)
registerEnglishFallback('th', 'oauthAdmin', enOauthAdmin);
registerEnglishFallback('zh', 'oauthAdmin', enOauthAdmin);

/**
 * Undo the side effect of the registrations above.
 *
 * `addResourceBundle` pushes every namespace it touches into the SHARED
 * `i18n.options.ns`. `i18n.loadNamespaces(x)` then does NOT load `x` — it appends
 * `x` and loads all of `options.ns` — and react-i18next calls exactly that on
 * every suspending `useTranslation`. So the first shell render (`Navbar`/`Sidebar`
 * use `nav`) pulled the whole accumulated list.
 *
 * That cost nothing until this fix, because th used to resolve to `en` and never
 * suspended; zh never paid either, since every one of those namespaces is already
 * in its store. It landed squarely on Thai users: 9 extra requests, 45,929 bytes
 * of admin-only chunks, for opening the login page. Measured, not theorised —
 * `coldBootRender.test.tsx` asserts the boot cost *after* a shell render, which is
 * where the fetch actually happens.
 *
 * Resetting to what `init()` declared is safe. `options.ns` is i18next's "which
 * namespaces to load" list: consulted when planning a load, appended to when a
 * page asks for a namespace. What is written back here is the same non-empty array
 * `init()` was handed, so nothing that reads it changes behaviour — and pages
 * append what they need as they mount.
 *
 * One reader is unrelated to loading: `Translator.extractFromKey` consults it to
 * decide whether a key's first segment names a namespace, but only on the
 * `nsSeparator === keySeparator` branch, and ours are the defaults `:` and `.`.
 * Set `nsSeparator: '.'` some day and revisit this line.
 *
 * The `ResourceStore` shares this same options object (asserted in
 * coldBootLanguage.test.ts: `store.options.ns === i18n.options.ns` after the
 * reassignment), so a later `addResourceBundle` — the feature-level i18n.ts files
 * — grows the new array, harmlessly: it puts the bundle in the store in the same
 * breath, leaving nothing to fetch.
 */
i18n.options.ns = [defaultNS];

// Also sync immediately in case init completed synchronously before the listener was ready
syncLocale(i18n.language);

export default i18n;
