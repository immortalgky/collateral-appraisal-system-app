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

import thCommon from './locales/th/common.json';
import thNav from './locales/th/nav.json';
import thWebhookAdmin from './locales/th/webhookAdmin.json';
import thInvoice from './locales/th/invoice.json';
import thServiceQualityEvaluation from './locales/th/serviceQualityEvaluation.json';
import thMonitoring from './locales/th/monitoring.json';
import thHistorySearch from './locales/th/historySearch.json';
import thBlockUnitMaintenance from './locales/th/blockUnitMaintenance.json';
import thLogAdmin from './locales/th/logAdmin.json';
import thReappraisal from './locales/th/reappraisal.json';
import thTaskMonitor from './locales/th/taskMonitor.json';
import thCommittee from './locales/th/committee.json';
import thNotification from './locales/th/notification.json';
import thMeeting from './locales/th/meeting.json';
import thTemplateManagement from './locales/th/templateManagement.json';
import thRequest from './locales/th/request.json';
import thQuotation from './locales/th/quotation.json';
import thDashboard from './locales/th/dashboard.json';
import thAuth from './locales/th/auth.json';
import thDocumentFollowup from './locales/th/documentFollowup.json';
import thMenuManagement from './locales/th/menuManagement.json';
import thSupportingDataMaintenance from './locales/th/supportingDataMaintenance.json';
import thUserManagement from './locales/th/userManagement.json';
import thPricingAnalysis from './locales/th/pricingAnalysis.json';
import thAppraisal from './locales/th/appraisal.json';
import thFeeAppointmentApproval from './locales/th/feeAppointmentApproval.json';
import thFeeApprovalConfig from './locales/th/feeApprovalConfig.json';
import thEvaluationConfig from './locales/th/evaluationConfig.json';
import thBlockProject from './locales/th/blockProject.json';
import thWorkflowBuilder from './locales/th/workflowBuilder.json';
import thBlockReappraisal from './locales/th/blockReappraisal.json';

import zhCommon from './locales/zh/common.json';
import zhNav from './locales/zh/nav.json';
import zhWebhookAdmin from './locales/zh/webhookAdmin.json';
import zhInvoice from './locales/zh/invoice.json';
import zhServiceQualityEvaluation from './locales/zh/serviceQualityEvaluation.json';
import zhLogAdmin from './locales/zh/logAdmin.json';
import zhReappraisal from './locales/zh/reappraisal.json';
import zhTaskMonitor from './locales/zh/taskMonitor.json';
import zhCommittee from './locales/zh/committee.json';
import zhNotification from './locales/zh/notification.json';
import zhMeeting from './locales/zh/meeting.json';
import zhTemplateManagement from './locales/zh/templateManagement.json';
import zhRequest from './locales/zh/request.json';
import zhQuotation from './locales/zh/quotation.json';
import zhDashboard from './locales/zh/dashboard.json';
import zhAuth from './locales/zh/auth.json';
import zhDocumentFollowup from './locales/zh/documentFollowup.json';
import zhMenuManagement from './locales/zh/menuManagement.json';
import zhSupportingDataMaintenance from './locales/zh/supportingDataMaintenance.json';
import zhUserManagement from './locales/zh/userManagement.json';
import zhPricingAnalysis from './locales/zh/pricingAnalysis.json';
import zhAppraisal from './locales/zh/appraisal.json';
import zhBlockProject from './locales/zh/blockProject.json';
import zhWorkflowBuilder from './locales/zh/workflowBuilder.json';
import zhBlockReappraisal from './locales/zh/blockReappraisal.json';

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
    logAdmin: thLogAdmin,
    reappraisal: thReappraisal,
    taskMonitor: thTaskMonitor,
    committee: thCommittee,
    notification: thNotification,
    meeting: thMeeting,
    templateManagement: thTemplateManagement,
    request: thRequest,
    quotation: thQuotation,
    dashboard: thDashboard,
    auth: thAuth,
    documentFollowup: thDocumentFollowup,
    menuManagement: thMenuManagement,
    supportingDataMaintenance: thSupportingDataMaintenance,
    userManagement: thUserManagement,
    pricingAnalysis: thPricingAnalysis,
    appraisal: thAppraisal,
    feeAppointmentApproval: thFeeAppointmentApproval,
    feeApprovalConfig: thFeeApprovalConfig,
    evaluationConfig: thEvaluationConfig,
    blockProject: thBlockProject,
    workflowBuilder: thWorkflowBuilder,
    blockReappraisal: thBlockReappraisal,
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
    logAdmin: zhLogAdmin,
    reappraisal: zhReappraisal,
    taskMonitor: zhTaskMonitor,
    committee: zhCommittee,
    notification: zhNotification,
    meeting: zhMeeting,
    templateManagement: zhTemplateManagement,
    request: zhRequest,
    quotation: zhQuotation,
    dashboard: zhDashboard,
    auth: zhAuth,
    documentFollowup: zhDocumentFollowup,
    menuManagement: zhMenuManagement,
    supportingDataMaintenance: zhSupportingDataMaintenance,
    userManagement: zhUserManagement,
    pricingAnalysis: zhPricingAnalysis,
    appraisal: zhAppraisal,
    feeAppointmentApproval: enFeeAppointmentApproval,
    feeApprovalConfig: enFeeApprovalConfig,
    evaluationConfig: enEvaluationConfig,
    blockProject: zhBlockProject,
    workflowBuilder: zhWorkflowBuilder,
    blockReappraisal: zhBlockReappraisal,
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
